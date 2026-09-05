// Debt CRUD operations — business logic in services, NOT components

import { getDb } from '../lib/db'
import type { Debt, DebtPayment } from '../lib/types'
import { generateId } from '../lib/formatters'
import { queueSync } from './sync-queue-helper'
import { enforcePermission, PERMISSIONS } from './sdk-bridge/rbac'
import { getCurrentRole } from './session-helper'

export async function getTotalDebtCollected(): Promise<number> {
  const db = await getDb()
  const row = await db.getFirstAsync<Record<string, unknown>>(
    "SELECT COALESCE(SUM(amount), 0) as total FROM debt_payments"
  )
  return Number(row?.total ?? 0)
}

export async function getDebtCollectedByDateRange(start: string, end: string): Promise<number> {
  const db = await getDb()
  const row = await db.getFirstAsync<Record<string, unknown>>(
    "SELECT COALESCE(SUM(amount), 0) as total FROM debt_payments WHERE created_at >= ? AND created_at <= ?",
    [start, end]
  )
  return Number(row?.total ?? 0)
}

export async function getAllDebts(): Promise<Debt[]> {
  const db = await getDb()
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM debts ORDER BY created_at DESC LIMIT 200'
  )
  return rows.map(mapRow)
}

export async function getDebtById(id: string): Promise<Debt | null> {
  const db = await getDb()
  const row = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM debts WHERE id = ?', [id]
  )
  if (!row) return null
  const debt = mapRow(row)
  await loadPayments(debt)
  return debt
}

export async function createDebt(data: {
  customerName?: string
  customerPhone?: string
  amount: number
  notes?: string
  saleId?: string
  customerId?: string
}): Promise<Debt> {
  await enforcePermission(await getCurrentRole(), PERMISSIONS.DEBT_MANAGE)
  const db = await getDb()
  const id = generateId()
  const now = new Date().toISOString()
  await db.runAsync(
    `INSERT INTO debts (id, customer_id, customer_name, customer_phone, sale_id,
       amount, amount_paid, status, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, 'pending', ?, ?, ?)`,
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
    ]
  )
  await queueSync('debts', 'create', id)
  return (await getDebtById(id))!
}

export async function recordDebtPayment(
  debtId: string,
  amount: number,
  paymentMethod: string,
  reference?: string,
  notes?: string
): Promise<Debt | null> {
  await enforcePermission(await getCurrentRole(), PERMISSIONS.DEBT_MANAGE)
  const db = await getDb()
  const debt = await getDebtById(debtId)
  if (!debt) return null

  const paymentId = generateId()
  const now = new Date().toISOString()
  await db.runAsync(
    `INSERT INTO debt_payments (id, debt_id, amount, payment_method, reference, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [paymentId, debtId, amount, paymentMethod, reference || null, notes || null, now]
  )

  const newPaid = debt.amountPaid + amount
  const newStatus = newPaid >= debt.amount ? 'paid' : 'partial'
  await db.runAsync(
    'UPDATE debts SET amount_paid = ?, status = ?, updated_at = ? WHERE id = ?',
    [newPaid, newStatus, now, debtId]
  )
  await queueSync('debt_payments', 'create', paymentId)
  return getDebtById(debtId)
}

async function loadPayments(debt: Debt): Promise<void> {
  const db = await getDb()
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM debt_payments WHERE debt_id = ? ORDER BY created_at DESC',
    [debt.id]
  )
  debt.payments = rows.map((row) => ({
    id: String(row.id),
    debtId: String(row.debt_id),
    amount: Number(row.amount) || 0,
    paymentMethod: String(row.payment_method || 'cash'),
    reference: row.reference ? String(row.reference) : undefined,
    notes: row.notes ? String(row.notes) : undefined,
    createdAt: String(row.created_at),
  }))
}

function mapRow(row: Record<string, unknown>): Debt {
  return {
    id: String(row.id),
    customerId: row.customer_id ? String(row.customer_id) : undefined,
    customerName: row.customer_name ? String(row.customer_name) : undefined,
    customerPhone: row.customer_phone ? String(row.customer_phone) : undefined,
    saleId: row.sale_id ? String(row.sale_id) : undefined,
    amount: Number(row.amount) || 0,
    amountPaid: Number(row.amount_paid) || 0,
    status: String(row.status || 'pending') as Debt['status'],
    dueDate: row.due_date ? String(row.due_date) : undefined,
    notes: row.notes ? String(row.notes) : undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

export async function getPendingDebtCount(): Promise<number> {
  const db = await getDb()
  const row = await db.getFirstAsync<Record<string, unknown>>(
    "SELECT COUNT(*) as cnt FROM debts WHERE status IN ('pending', 'partial')"
  )
  return Number(row?.cnt ?? 0)
}
