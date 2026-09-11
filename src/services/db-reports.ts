// db-reports.ts — Operational dashboard queries from canonical local records.
// Phase 12
//
// DATA OWNERSHIP RULE:
//   - All queries read from LOCAL SQLite (expo-sqlite) — the device's offline store.
//   - Cloud/FIDScript data is NOT included here; cloud snapshot is a separate sync layer.
//   - Reports must NEVER mix local SQLite numbers with cloud numbers as if they were courrent.
//
// RECONCILIATION RULES:
//   - Sales total = SUM(completed sales) WHERE created_at in range — derived, not cached.
//   - Debt balance = debt.amount − SUM(debt_payments.amount) — derived on every query.
//   - Sync replay of the same event does NOT change the report total (idempotency keys).
//
// CANONICAL SOURCES:
//   sales          → completed sales records
//   inventory_transactions → stock movement ledger
//   debts          → outstanding balances
//   debt_payments  → payment history
//   sync_queue     → pending sync count (not a canonical record for reports)

import { getDb } from '../lib/db'
import type { Sale } from '../lib/types'
import { mapSaleRow } from './db-sales-mapper'

// ── Dashboard: Today's operational snapshot ─────────────────────────────────

export interface TodaySalesSummary {
  /** SUM of completed sales total_amount for today (local only). */
  totalAmount: number
  count: number
  cashAmount: number
  cashCount: number
  mpesaAmount: number
  mpesaCount: number
  debtAmount: number
  debtCount: number
  /** ISO timestamp of oldest completed sale today (local). */
  periodStart: string | null
  /** ISO timestamp of newest completed sale today (local). */
  periodEnd: string | null
}

/** Today's completed sales from local SQLite only. Does not query cloud. */
export async function getTodaySalesSummary(): Promise<TodaySalesSummary> {
  const db = await getDb()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const startIso = today.toISOString()

  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM sales WHERE status = 'completed' AND created_at >= ? ORDER BY created_at ASC`,
    [startIso],
  )

  let totalAmount = 0, cashAmount = 0, mpesaAmount = 0, debtAmount = 0
  let count = 0, cashCount = 0, mpesaCount = 0, debtCount = 0
  let periodStart: string | null = null
  let periodEnd: string | null = null

  for (const row of rows) {
    const amt = Number(row.total_amount) || 0
    const pm = String(row.payment_method || 'cash')
    totalAmount += amt
    count += 1
    if (!periodStart) periodStart = String(row.created_at)
    periodEnd = String(row.created_at)
    if (pm === 'cash') { cashAmount += amt; cashCount += 1 }
    else if (pm === 'mpesa' || pm === 'mobile_money') { mpesaAmount += amt; mpesaCount += 1 }
    else if (pm === 'debt') { debtAmount += amt; debtCount += 1 }
  }

  return { totalAmount, count, cashAmount, cashCount, mpesaAmount, mpesaCount, debtAmount, debtCount, periodStart, periodEnd }
}

// ── Dashboard: Stock indicators ──────────────────────────────────────────────

export interface StockIndicators {
  totalProducts: number
  lowStockCount: number
  outOfStockCount: number
  /** Products with track_inventory=1 and current_stock <= low_stock_threshold. */
  lowStockItems: Array<{ id: string; name: string; currentStock: number; threshold: number }>
}

/** Local stock levels — not sourced from cloud. */
export async function getStockIndicators(): Promise<StockIndicators> {
  const db = await getDb()

  const [totalRow, lowStockRows] = await Promise.all([
    db.getFirstAsync<Record<string, unknown>>(
      `SELECT COUNT(*) as cnt FROM products WHERE is_active = 1 AND track_inventory = 1`,
    ),
    db.getAllAsync<Record<string, unknown>>(
      `SELECT id, name, current_stock, low_stock_threshold
       FROM products
       WHERE is_active = 1
         AND track_inventory = 1
         AND low_stock_threshold > 0
         AND current_stock <= low_stock_threshold
       ORDER BY current_stock ASC
       LIMIT 20`,
    ),
  ])

  const totalProducts = Number(totalRow?.cnt ?? 0)
  const lowStockCount = lowStockRows.length
  const outOfStockCount = lowStockRows.filter((r) => Number(r.current_stock) <= 0).length

  return {
    totalProducts,
    lowStockCount,
    outOfStockCount,
    lowStockItems: lowStockRows.map((r) => ({
      id: String(r.id),
      name: String(r.name),
      currentStock: Number(r.current_stock) || 0,
      threshold: Number(r.low_stock_threshold) || 0,
    })),
  }
}

// ── Dashboard: Debt / customer indicators ─────────────────────────────────

export interface DebtIndicators {
  /** Count of debts with status pending OR partial. */
  activeDebtCount: number
  /** Count of debts past their due_date with status not paid. */
  overdueDebtCount: number
  /** Total outstanding balance = SUM(debt.amount − paid) across pending+partial debts. */
  totalOutstanding: number
  /** Total amount collected from debt_payments today (local only). */
  collectedToday: number
}

/**
 * Derive outstanding balance per debt: amount − SUM(payments).
 * This is the canonical Phase 11 balance = amount − Σ(payments) rule.
 */
export async function getDebtIndicators(): Promise<DebtIndicators> {
  const db = await getDb()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayIso = today.toISOString()

  // Active debts (pending + partial)
  const debtRows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT d.id, d.amount, d.status, d.due_date,
            COALESCE(p.paid_sum, 0) as amount_paid
     FROM debts d
     LEFT JOIN (
       SELECT debt_id, SUM(amount) as paid_sum
       FROM debt_payments
       GROUP BY debt_id
     ) p ON d.id = p.debt_id
     WHERE d.status IN ('pending', 'partial')`,
  )

  let activeDebtCount = 0
  let overdueDebtCount = 0
  let totalOutstanding = 0

  const now = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

  for (const row of debtRows) {
    const amount = Number(row.amount) || 0
    const amountPaid = Number(row.amount_paid) || 0
    const balance = amount - amountPaid
    const status = String(row.status)
    const dueDate = row.due_date ? String(row.due_date).slice(0, 10) : null

    activeDebtCount += 1
    if (balance > 0) totalOutstanding += balance
    if (dueDate && dueDate < now && status !== 'paid') overdueDebtCount += 1
  }

  // Debt collected today
  const collectedRow = await db.getFirstAsync<Record<string, unknown>>(
    `SELECT COALESCE(SUM(amount), 0) as total
     FROM debt_payments
     WHERE created_at >= ?`,
    [todayIso],
  )
  const collectedToday = Number(collectedRow?.total ?? 0)

  return { activeDebtCount, overdueDebtCount, totalOutstanding, collectedToday }
}

// ── Reports: Completed sales for a date range (canonical derivation) ────────

export interface SalesByDateRange {
  sales: Sale[]
  totalAmount: number
  cashAmount: number
  mpesaAmount: number
  debtAmount: number
  periodStart: string | null
  periodEnd: string | null
}

/**
 * Completed sales within a date range — derived from local SQLite.
 * Reconciliation: totalAmount = SUM(s.total_amount) over returned rows.
 * Sync replay does NOT change this total (completed status is immutable on replay).
 */
export async function getSalesByDateRange(startIso: string, endIso: string): Promise<SalesByDateRange> {
  const db = await getDb()
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM sales
     WHERE status = 'completed'
       AND created_at >= ?
       AND created_at <= ?
     ORDER BY created_at ASC`,
    [startIso, endIso],
  )

  const sales = rows.map(mapSaleRow)
  let totalAmount = 0, cashAmount = 0, mpesaAmount = 0, debtAmount = 0
  let periodStart: string | null = null
  let periodEnd: string | null = null

  for (const s of sales) {
    totalAmount += s.totalAmount
    if (!periodStart) periodStart = s.createdAt
    periodEnd = s.createdAt
    if (s.paymentMethod === 'cash') cashAmount += s.totalAmount
    else if (s.paymentMethod === 'mpesa' || s.paymentMethod === 'mobile_money') mpesaAmount += s.totalAmount
    else if (s.paymentMethod === 'debt') debtAmount += s.totalAmount
  }

  return { sales, totalAmount, cashAmount, mpesaAmount, debtAmount, periodStart, periodEnd }
}

// ── Sync / cloud status context for reports UI ───────────────────────────────

export interface SyncReportContext {
  /** True when device has connectivity and cloud is reachable. */
  isOnline: boolean
  /** ISO timestamp of last successful full sync (from sync_state table). */
  lastSyncedAt: string | null
  /** Count of pending items in the local sync queue. */
  pendingSyncCount: number
  /**
   * Data freshness note for display.
   * When offline, reports reflect last-synced state plus any locally-created records.
   */
  dataFreshnessNote: string
}

export async function getSyncReportContext(): Promise<SyncReportContext> {
  const db = await getDb()

  const syncStateRow = await db.getFirstAsync<Record<string, unknown>>(
    `SELECT last_sync_at FROM sync_state ORDER BY id DESC LIMIT 1`,
  )
  const lastSyncedAt = syncStateRow?.last_sync_at ? String(syncStateRow.last_sync_at) : null

  const pendingRow = await db.getFirstAsync<Record<string, unknown>>(
    `SELECT COUNT(*) as cnt FROM sync_queue WHERE status = 'pending'`,
  )
  const pendingSyncCount = Number(pendingRow?.cnt ?? 0)

  // isOnline is determined by cloudPing() at runtime; we return false as default here.
  // The UI layer updates this via cloudPing() call.
  const isOnline = false

  const dataFreshnessNote = lastSyncedAt
    ? `Local data — last cloud sync: ${new Date(lastSyncedAt).toLocaleString('en-KE')}`
    : `Local data only — never synced to cloud`

  return { isOnline, lastSyncedAt, pendingSyncCount, dataFreshnessNote }
}
