// db-reports-full.ts — Full report service: dashboard, sales, inventory, debt, expense.
// Phase 13
//
// DATA OWNERSHIP RULE:
//   All queries read from LOCAL SQLite (expo-sqlite) — the device's offline store.
//   Cloud/FIDScript data is NOT included here; cloud snapshot is a separate sync layer.
//
// CANONICAL SOURCES:
//   sales           → completed sales records
//   sale_items      → per-product breakdown within sales
//   products        → inventory with track_inventory, current_stock, low_stock_threshold
//   inventory_transactions → stock movement ledger (last_movement_date)
//   debts           → outstanding balances
//   debt_payments   → payment history
//   expenses        → expense records with status
//   expense_categories → expense category names/colors

import { getDb } from '../lib/db'
import type { Sale } from '../lib/types'
import { mapSaleRow } from './db-sales-mapper'

// ─────────────────────────────────────────────────────────────────
// DASHBOARD SUMMARY
// ─────────────────────────────────────────────────────────────────

export interface DashboardSummary {
  todaySales: number
  weekSales: number
  monthSales: number
  todayRevenue: number
  weekRevenue: number
  monthRevenue: number
  monthCost: number
  grossProfit: number
  grossMargin: number
  lowStockCount: number
  outstandingDebts: number
  pendingExpenses: number
  activeCustomers: number
}

/**
 * Derive sales/revenue for today, this week, this month.
 * grossMargin = (grossProfit / monthRevenue) * 100.
 */
export async function getDashboardSummary(): Promise<DashboardSummary> {
  const db = await getDb()
  const now = new Date()

  const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0)
  const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - now.getDay()); startOfWeek.setHours(0, 0, 0, 0)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)

  const [todayRows, weekRows, monthRows] = await Promise.all([
    db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM sales WHERE status = 'completed' AND created_at >= ?`,
      [startOfToday.toISOString()],
    ),
    db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM sales WHERE status = 'completed' AND created_at >= ?`,
      [startOfWeek.toISOString()],
    ),
    db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM sales WHERE status = 'completed' AND created_at >= ?`,
      [startOfMonth.toISOString()],
    ),
  ])

  function sumRevenue(rows: Record<string, unknown>[]): number {
    return rows.reduce((acc, r) => acc + (Number(r.total_amount) || 0), 0)
  }
  function sumCost(rows: Record<string, unknown>[]): number {
    return rows.reduce((acc, r) => acc + (Number(r.total_cost) || 0), 0)
  }

  const todayRevenue = sumRevenue(todayRows)
  const weekRevenue = sumRevenue(weekRows)
  const monthRevenue = sumRevenue(monthRows)
  const monthCost = sumCost(monthRows)
  const grossProfit = monthRevenue - monthCost
  const grossMargin = monthRevenue > 0 ? (grossProfit / monthRevenue) * 100 : 0

  // Low stock count
  const lowStockRow = await db.getFirstAsync<Record<string, unknown>>(
    `SELECT COUNT(*) as cnt FROM products
     WHERE is_active = 1 AND track_inventory = 1
       AND low_stock_threshold > 0 AND current_stock <= low_stock_threshold`,
  )
  const lowStockCount = Number(lowStockRow?.cnt ?? 0)

  // Outstanding debts
  const debtRows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT d.id, d.amount, COALESCE(p.paid_sum, 0) as amount_paid
     FROM debts d
     LEFT JOIN (SELECT debt_id, SUM(amount) as paid_sum FROM debt_payments GROUP BY debt_id) p
       ON d.id = p.debt_id
     WHERE d.status IN ('pending', 'partial')`,
  )
  let outstandingDebts = 0
  for (const r of debtRows) {
    outstandingDebts += Math.max(0, Number(r.amount) - Number(r.amount_paid))
  }

  // Pending expenses count
  const pendingExpRow = await db.getFirstAsync<Record<string, unknown>>(
    `SELECT COUNT(*) as cnt FROM expenses WHERE status = 'pending'`,
  )
  const pendingExpenses = Number(pendingExpRow?.cnt ?? 0)

  // Active customers (have made a completed sale)
  const activeCustRow = await db.getFirstAsync<Record<string, unknown>>(
    `SELECT COUNT(DISTINCT customer_id_number) as cnt FROM sales
     WHERE status = 'completed' AND customer_id_number IS NOT NULL AND customer_id_number != ''`,
  )
  const activeCustomers = Number(activeCustRow?.cnt ?? 0)

  return {
    todaySales: todayRows.length,
    weekSales: weekRows.length,
    monthSales: monthRows.length,
    todayRevenue,
    weekRevenue,
    monthRevenue,
    monthCost,
    grossProfit,
    grossMargin,
    lowStockCount,
    outstandingDebts,
    pendingExpenses,
    activeCustomers,
  }
}

// ─────────────────────────────────────────────────────────────────
// SALES REPORT
// ─────────────────────────────────────────────────────────────────

export interface SalesReport {
  period: { from: string; to: string }
  totalSales: number
  totalRevenue: number
  totalCost: number
  grossProfit: number
  grossMargin: number
  byPaymentMethod: Record<string, { count: number; amount: number }>
  topProducts: Array<{ productId: string; name: string; quantitySold: number; revenue: number }>
  salesCount: number
  averageSaleValue: number
}

export async function getSalesReport(startIso: string, endIso: string): Promise<SalesReport> {
  const db = await getDb()

  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM sales WHERE status = 'completed' AND created_at >= ? AND created_at <= ? ORDER BY created_at ASC`,
    [startIso, endIso],
  )

  let totalRevenue = 0, totalCost = 0
  let salesCount = 0
  const byPaymentMethod: Record<string, { count: number; amount: number }> = {}
  const productRevenue: Record<string, { name: string; quantity: number; revenue: number }> = {}

  for (const row of rows) {
    const amt = Number(row.total_amount) || 0
    const cost = Number(row.total_cost) || 0
    totalRevenue += amt
    totalCost += cost
    salesCount += 1

    const pm = String(row.payment_method || 'cash')
    if (!byPaymentMethod[pm]) byPaymentMethod[pm] = { count: 0, amount: 0 }
    byPaymentMethod[pm].count += 1
    byPaymentMethod[pm].amount += amt

    // sale items for this sale
    const itemRows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM sale_items WHERE sale_id = ?`,
      [String(row.id)],
    )
    for (const item of itemRows) {
      const pid = String(item.product_id || 'unknown')
      const qty = Number(item.quantity) || 0
      const itemRevenue = Number(item.total_price) || 0
      const pName = String(item.product_name || 'Unknown')
      if (!productRevenue[pid]) productRevenue[pid] = { name: pName, quantity: 0, revenue: 0 }
      productRevenue[pid].quantity += qty
      productRevenue[pid].revenue += itemRevenue
    }
  }

  const grossProfit = totalRevenue - totalCost
  const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0
  const averageSaleValue = salesCount > 0 ? totalRevenue / salesCount : 0

  const topProducts = Object.entries(productRevenue)
    .sort(([, a], [, b]) => b.revenue - a.revenue)
    .slice(0, 10)
    .map(([productId, v]) => ({ productId, name: v.name, quantitySold: v.quantity, revenue: v.revenue }))

  const sortedRows = [...rows].sort((a, b) => new Date(String(a.created_at)).getTime() - new Date(String(b.created_at)).getTime())
  const periodFrom = sortedRows.length > 0 ? String(sortedRows[0].created_at) : startIso
  const periodTo = sortedRows.length > 0 ? String(sortedRows[sortedRows.length - 1].created_at) : endIso

  return {
    period: { from: periodFrom, to: periodTo },
    totalSales: salesCount,
    totalRevenue,
    totalCost,
    grossProfit,
    grossMargin,
    byPaymentMethod,
    topProducts,
    salesCount,
    averageSaleValue,
  }
}

// ─────────────────────────────────────────────────────────────────
// INVENTORY REPORT
// ─────────────────────────────────────────────────────────────────

export interface InventoryReport {
  totalProducts: number
  totalStockValue: number
  lowStockCount: number
  outOfStockCount: number
  deadStock: Array<{ productId: string; name: string; lastMovementDate: string }>
  reorderSuggestions: Array<{ productId: string; name: string; currentStock: number; threshold: number; suggestedOrder: number }>
}

export async function getInventoryReport(): Promise<InventoryReport> {
  const db = await getDb()

  const [totalRow, lowStockRows, stockValRows] = await Promise.all([
    db.getFirstAsync<Record<string, unknown>>(
      `SELECT COUNT(*) as cnt FROM products WHERE is_active = 1 AND track_inventory = 1`,
    ),
    db.getAllAsync<Record<string, unknown>>(
      `SELECT id, name, current_stock, low_stock_threshold
       FROM products
       WHERE is_active = 1 AND track_inventory = 1
         AND low_stock_threshold > 0 AND current_stock <= low_stock_threshold
       ORDER BY current_stock ASC`,
    ),
    db.getAllAsync<Record<string, unknown>>(
      `SELECT id, name, current_stock, cost_price
       FROM products WHERE is_active = 1 AND track_inventory = 1 AND current_stock > 0`,
    ),
  ])

  const totalProducts = Number(totalRow?.cnt ?? 0)
  const lowStockCount = lowStockRows.length
  const outOfStockCount = lowStockRows.filter(r => Number(r.current_stock) <= 0).length

  // Stock value = SUM(current_stock * cost_price)
  const totalStockValue = stockValRows.reduce(
    (acc, r) => acc + (Number(r.current_stock) || 0) * (Number(r.cost_price) || 0), 0)

  // Dead stock: products with no inventory_transaction in last 30 days
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const deadStockRows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT p.id, p.name, MAX(it.created_at) as last_movement
     FROM products p
     LEFT JOIN inventory_transactions it ON it.product_id = p.id
     WHERE p.is_active = 1 AND p.track_inventory = 1 AND p.current_stock > 0
     GROUP BY p.id
     HAVING last_movement IS NULL OR last_movement < ?
     ORDER BY p.current_stock DESC`,
    [thirtyDaysAgo.toISOString()],
  )

  const deadStock = deadStockRows.map(r => ({
    productId: String(r.id),
    name: String(r.name),
    lastMovementDate: r.last_movement ? String(r.last_movement) : 'never',
  }))

  // Reorder suggestions: low stock items with threshold > 0
  const reorderSuggestions = lowStockRows.map(r => {
    const currentStock = Number(r.current_stock) || 0
    const threshold = Number(r.low_stock_threshold) || 0
    const suggestedOrder = Math.max(0, threshold * 2 - currentStock)
    return {
      productId: String(r.id),
      name: String(r.name),
      currentStock,
      threshold,
      suggestedOrder,
    }
  })

  return { totalProducts, totalStockValue, lowStockCount, outOfStockCount, deadStock, reorderSuggestions }
}

// ─────────────────────────────────────────────────────────────────
// DEBT REPORT
// ─────────────────────────────────────────────────────────────────

export interface DebtReport {
  totalOutstanding: number
  overdueCount: number
  partialCount: number
  agingBuckets: { '0-30': number; '31-60': number; '61-90': number; '90+': number }
  byCustomer: Array<{ customerId: string; name: string; outstanding: number; debtCount: number }>
}

export async function getDebtReport(): Promise<DebtReport> {
  const db = await getDb()
  const now = new Date()

  const debtRows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT d.id, d.amount, d.status, d.due_date, d.customer_id_number,
            COALESCE(p.paid_sum, 0) as amount_paid,
            c.name as customer_name
     FROM debts d
     LEFT JOIN (SELECT debt_id, SUM(amount) as paid_sum FROM debt_payments GROUP BY debt_id) p
       ON d.id = p.debt_id
     LEFT JOIN customers c ON d.customer_id_number = c.id_number
     WHERE d.status IN ('pending', 'partial')`,
  )

  let totalOutstanding = 0
  let overdueCount = 0
  let partialCount = 0
  const agingBuckets = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 }
  const customerMap: Record<string, { name: string; outstanding: number; debtCount: number }> = {}
  const nowIso = now.toISOString().slice(0, 10) // YYYY-MM-DD

  for (const row of debtRows) {
    const amount = Number(row.amount) || 0
    const amountPaid = Number(row.amount_paid) || 0
    const balance = amount - amountPaid
    if (balance <= 0) continue

    totalOutstanding += balance
    if (String(row.status) === 'partial') partialCount += 1

    // Overdue check
    const dueDate = row.due_date ? String(row.due_date).slice(0, 10) : null
    if (dueDate && dueDate < nowIso) overdueCount += 1

    // Aging bucket
    if (dueDate) {
      const due = new Date(dueDate)
      const diffDays = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24))
      if (diffDays <= 30) agingBuckets['0-30'] += balance
      else if (diffDays <= 60) agingBuckets['31-60'] += balance
      else if (diffDays <= 90) agingBuckets['61-90'] += balance
      else agingBuckets['90+'] += balance
    } else {
      // No due date: put in 90+
      agingBuckets['90+'] += balance
    }

    // By customer
    const custId = String(row.customer_id_number || 'unknown')
    if (!customerMap[custId]) {
      customerMap[custId] = { name: String(row.customer_name || 'Unknown'), outstanding: 0, debtCount: 0 }
    }
    customerMap[custId].outstanding += balance
    customerMap[custId].debtCount += 1
  }

  const byCustomer = Object.entries(customerMap)
    .sort(([, a], [, b]) => b.outstanding - a.outstanding)
    .map(([customerId, v]) => ({ customerId, name: v.name, outstanding: v.outstanding, debtCount: v.debtCount }))

  return { totalOutstanding, overdueCount, partialCount, agingBuckets, byCustomer }
}

// ─────────────────────────────────────────────────────────────────
// EXPENSE REPORT (monthly)
// ─────────────────────────────────────────────────────────────────

export interface ExpenseReport {
  total: number
  byCategory: Record<string, number>
  pendingCount: number
  vsPriorMonth: number // percentage change
}

export async function getExpenseReport(year: number, month: number): Promise<ExpenseReport> {
  const db = await getDb()
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = `${year}-${String(month).padStart(2, '0')}-31`

  // This month
  const totalRow = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE date >= ? AND date <= ?`,
    [startDate, endDate],
  )
  const pendingRow = await db.getFirstAsync<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM expenses WHERE date >= ? AND date <= ? AND status = 'pending'`,
    [startDate, endDate],
  )
  const catRows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT ec.id, COALESCE(SUM(e.amount), 0) as total
     FROM expense_categories ec
     LEFT JOIN expenses e ON e.category_id = ec.id AND e.date >= ? AND e.date <= ?
     WHERE ec.is_active = 1
     GROUP BY ec.id
     HAVING total > 0`,
    [startDate, endDate],
  )

  const total = totalRow?.total ?? 0
  const pendingCount = pendingRow?.cnt ?? 0
  const byCategory: Record<string, number> = {}
  for (const r of catRows) byCategory[String(r.id)] = Number(r.total) || 0

  // Prior month
  let priorYear = year, priorMonth = month - 1
  if (priorMonth < 1) { priorMonth = 12; priorYear -= 1 }
  const priorStart = `${priorYear}-${String(priorMonth).padStart(2, '0')}-01`
  const priorEnd = `${priorYear}-${String(priorMonth).padStart(2, '0')}-31`
  const priorRow = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE date >= ? AND date <= ?`,
    [priorStart, priorEnd],
  )
  const priorTotal = priorRow?.total ?? 0
  const vsPriorMonth = priorTotal > 0 ? ((total - priorTotal) / priorTotal) * 100 : 0

  return { total, byCategory, pendingCount, vsPriorMonth }
}
