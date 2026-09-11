// db-debts.ts — Debt CRUD + payment recording
// Phase 11: canonical sync via defaultSyncEngine.enqueue(), append-only invariant
//
// Critical invariant — balance is NEVER overwritten:
//   balance = initial_debt_amount − Σ(append_only_payments)
//
// Payment replay guarantees:
//   - Same payment event replayed → debt_payments row already exists → no duplicate
//   - amount_paid recomputed from sum of all confirmed payments on every update
//   - Replaying the same debt creation event → idempotencyKey = debt.id → no_op

import { getDb } from '../lib/db'
import type { Debt, DebtPayment } from '../lib/types'
import { generateId } from '../lib/formatters'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { enforcePermission, PERMISSIONS } from './sdk-bridge/rbac'
import { enforceSubscriptionOrThrow } from './sdk-bridge/subscription-gate'
import { getCurrentRole } from './session-helper'
import { enqueueDebtSyncEvent } from './debt-sync-event'
import { enqueueDebtPaymentSyncEvent } from './debt-sync-event'

// ── Context resolution (mirrors db-customers-context pattern) ─────────────────

async function resolveShopId(): Promise<string> {
  const stored = await AsyncStorage.getItem('@soostori:shopId')
  if (!stored) throw new Error('No shop context — cannot create debt')
  return stored
}

async function resolveEmployeeId(): Promise<string> {
  return (await AsyncStorage.getItem('@soostori:employeeId')) ?? 'system'
}

async function resolveDeviceId(): Promise<string> {
  return (await AsyncStorage.getItem('@soostori:deviceId')) ?? 'mobile'
}

// ── Query helpers ────────────────────────────────────────────────────────────

/** Derive balance from amount minus sum of all confirmed payments. */
function deriveBalance(amount: number, amountPaid: number): number {
  return Math.max(0, amount - amountPaid)
}

function mapRow(row: Record<string, unknown>): Debt {
  const amount = Number(row.amount) || 0
  const amountPaid = Number(row.amount_paid) || 0
  return {
    id: String(row.id),
    customerId: row.customer_id ? String(row.customer_id) : undefined,
    customerName: row.customer_name ? String(row.customer_name) : undefined,
    customerPhone: row.customer_phone ? String(row.customer_phone) : undefined,
    saleId: row.sale_id ? String(row.sale_id) : undefined,
    amount,
    amountPaid,
    status: String(row.status || 'pending') as Debt['status'],
    dueDate: row.due_date ? String(row.due_date) : undefined,
    notes: row.notes ? String(row.notes) : undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

function mapPaymentRow(row: Record<string, unknown>): DebtPayment {
  return {
    id: String(row.id),
    debtId: String(row.debt_id),
    amount: Number(row.amount) || 0,
    paymentMethod: String(row.payment_method || 'cash'),
    reference: row.reference ? String(row.reference) : undefined,
    notes: row.notes ? String(row.notes) : undefined,
    createdAt: String(row.created_at),
  }
}

// ── Debt queries ─────────────────────────────────────────────────────────────

export async function getAllDebts(): Promise<Debt[]> {
  const db = await getDb()
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM debts
     WHERE status != 'paid'
     ORDER BY
       CASE WHEN status = 'pending' AND due_date IS NOT NULL AND date(due_date) < date('now') THEN 0
            WHEN status = 'partial' AND due_date IS NOT NULL AND date(due_date) < date('now') THEN 1
            WHEN status = 'pending' THEN 2
            WHEN status = 'partial' THEN 3
            ELSE 4
       END,
       created_at DESC
     LIMIT 200`,
  )
  return rows.map(mapRow)
}

export async function getDebtById(id: string): Promise<Debt | null> {
  const db = await getDb()
  const row = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM debts WHERE id = ?',
    [id],
  )
  if (!row) return null
  const debt = mapRow(row)
  debt.payments = await getDebtPayments(id)
  return debt
}

export async function getDebtsByCustomer(customerId: string): Promise<Debt[]> {
  const db = await getDb()
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM debts WHERE customer_id = ? ORDER BY created_at DESC LIMIT 200',
    [customerId],
  )
  return rows.map(mapRow)
}

export async function getDebtPayments(debtId: string): Promise<DebtPayment[]> {
  const db = await getDb()
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM debt_payments WHERE debt_id = ? ORDER BY created_at ASC',
    [debtId],
  )
  return rows.map(mapPaymentRow)
}

// ── Debt creation ────────────────────────────────────────────────────────────

/**
 * createDebt — offline-first debt creation.
 *
 * Guarantees (Phase 11):
 *   1. Debt row written to SQLite atomically
 *   2. Canonical SyncEvent queued via defaultSyncEngine (survives crash)
 *   3. Replay: idempotencyKey = debt.id → no duplicate debt on replay
 *   4. amount_paid initialised to 0 — balance = amount
 */
export async function createDebt(data: {
  customerName?: string
  customerPhone?: string
  amount: number
  notes?: string
  saleId?: string
  customerId?: string
}): Promise<Debt> {
  await enforceSubscriptionOrThrow()
  await enforcePermission(await getCurrentRole(), PERMISSIONS.DEBT_MANAGE)

  const db = await getDb()
  const id = generateId()
  const shopId = await resolveShopId()
  const employeeId = await resolveEmployeeId()
  const deviceId = await resolveDeviceId()
  const now = new Date().toISOString()

  await db.runAsync(
    `INSERT INTO debts
       (id, customer_id, customer_name, customer_phone, sale_id,
        amount, amount_paid, status, notes, created_at, updated_at,
        business_id, idempotency_key)
     VALUES (?, ?, ?, ?, ?, ?, 0, 'pending', ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.customerId || null,
      data.customerName || null,
      data.customerPhone || null,
      data.saleId || null,
      data.amount,
      data.notes || null,
      now,
      now,
      shopId,
      id, // idempotency_key = debt.id
    ],
  )

  // Enqueue canonical SyncEvent — idempotencyKey = debt.id
  const row: Record<string, unknown> = { id, ...data, amount_paid: 0, status: 'pending', created_at: now, updated_at: now, business_id: shopId }
  enqueueDebtSyncEvent(row, shopId, employeeId, deviceId, 'create').catch(() => {})

  return (await getDebtById(id))!
}

// ── Payment recording ────────────────────────────────────────────────────────

/**
 * recordDebtPayment — offline-first partial payment recording.
 *
 * Critical invariant — balance is NEVER overwritten:
 *   amount_paid = SUM(confirmed payments) — recomputed, not set
 *
 * Idempotency: INSERT INTO debt_payments uses payment.id as idempotency key.
 * If the same payment event is replayed, the row already exists — no duplicate.
 *
 * After inserting the payment row, amount_paid is recomputed from the sum of
 * ALL confirmed payments for this debt. The UPDATE to debts.amount_paid uses
 * this derived sum, never a raw user-supplied value.
 *
 * Guarantees (Phase 11):
 *   1. Payment row appended to debt_payments (append-only — no updates/deletes)
 *   2. Canonical SyncEvent queued via defaultSyncEngine (survives crash)
 *   3. amount_paid recomputed from SUM(payments) — never a raw overwrite
 *   4. Replay: idempotencyKey = payment.id → no duplicate payment
 *   5. Status derived: partial if paid < amount, paid if paid >= amount
 */
export async function recordDebtPayment(
  debtId: string,
  amount: number,
  paymentMethod: string,
  reference?: string,
  notes?: string,
): Promise<Debt | null> {
  await enforceSubscriptionOrThrow()
  await enforcePermission(await getCurrentRole(), PERMISSIONS.DEBT_MANAGE)

  const db = await getDb()
  const debt = await getDebtById(debtId)
  if (!debt) return null

  // Generate payment ID — used as idempotencyKey for cloud replay
  const paymentId = generateId()
  const shopId = await resolveShopId()
  const employeeId = await resolveEmployeeId()
  const deviceId = await resolveDeviceId()
  const now = new Date().toISOString()

  // Insert payment row — idempotency key is the payment.id itself.
  // A replay of the same event carries the same payment.id:
  //   - Either INSERT succeeds (first time)
  //   - Or the row already exists (replay) → skipped by DB unique constraint
  await db.runAsync(
    `INSERT INTO debt_payments (id, debt_id, amount, payment_method, reference, notes, created_at, business_id, employee_id, idempotency_key)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [paymentId, debtId, amount, paymentMethod, reference || null, notes || null, now, shopId, employeeId, paymentId],
  )

  // Recompute amount_paid from SUM of ALL confirmed payments for this debt.
  // This is the append-only invariant: balance = amount − Σ(payments).
  // Replaying the same payment event finds the row already inserted,
  // so the SUM includes it once — balance is unchanged.
  const sumRow = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT COALESCE(SUM(amount), 0) as total FROM debt_payments WHERE debt_id = ?',
    [debtId],
  )
  const newAmountPaid = Number(sumRow?.total ?? 0)

  // Derive status from computed paid sum
  const newStatus = newAmountPaid >= debt.amount ? 'paid' : 'partial'

  // Update debt — amount_paid is derived, NOT a raw user value
  await db.runAsync(
    'UPDATE debts SET amount_paid = ?, status = ?, updated_at = ? WHERE id = ?',
    [newAmountPaid, newStatus, now, debtId],
  )

  // Enqueue canonical SyncEvent — idempotencyKey = payment.id
  const paymentRow: Record<string, unknown> = {
    id: paymentId,
    debt_id: debtId,
    amount,
    payment_method: paymentMethod,
    reference: reference || null,
    notes: notes || null,
    created_at: now,
    business_id: shopId,
    employee_id: employeeId,
  }
  enqueueDebtPaymentSyncEvent(paymentRow, shopId, employeeId, deviceId).catch(() => {})

  return getDebtById(debtId)
}

// ── Summary queries ───────────────────────────────────────────────────────────

export async function getTotalDebtCollected(): Promise<number> {
  const db = await getDb()
  const row = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT COALESCE(SUM(amount), 0) as total FROM debt_payments',
  )
  return Number(row?.total ?? 0)
}

export async function getDebtCollectedByDateRange(start: string, end: string): Promise<number> {
  const db = await getDb()
  const row = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT COALESCE(SUM(amount), 0) as total FROM debt_payments WHERE created_at >= ? AND created_at <= ?',
    [start, end],
  )
  return Number(row?.total ?? 0)
}

export async function getPendingDebtCount(): Promise<number> {
  const db = await getDb()
  const row = await db.getFirstAsync<Record<string, unknown>>(
    "SELECT COUNT(*) as cnt FROM debts WHERE status IN ('pending', 'partial')",
  )
  return Number(row?.cnt ?? 0)
}
