// Expense CRUD operations — business logic in services, NOT components
// Phase 12: status workflow (pending → approved → paid) + monthly report + sync events

import { getDb } from '../lib/db'
import type { Expense, ExpenseCategory } from '../lib/types'
import { generateId } from '../lib/formatters'
import { queueSync } from './sync-queue-helper'
import { enforcePermission, PERMISSIONS } from './sdk-bridge/rbac'
import { enforceSubscriptionOrThrow } from './sdk-bridge/subscription-gate'
import { getCurrentRole } from './session-helper'
import AsyncStorage from '@react-native-async-storage/async-storage'

// ── Context resolution ──────────────────────────────────────────────────────────

async function resolveShopId(): Promise<string> {
  const stored = await AsyncStorage.getItem('@soostori:shopId')
  if (!stored) throw new Error('No shop context — cannot create expense')
  return stored
}

async function resolveEmployeeId(): Promise<string> {
  return (await AsyncStorage.getItem('@soostori:employeeId')) ?? 'system'
}

async function resolveDeviceId(): Promise<string> {
  return (await AsyncStorage.getItem('@soostori:deviceId')) ?? 'mobile'
}

// ── Read ───────────────────────────────────────────────────────────────────────

export async function getAllExpenses(): Promise<Expense[]> {
  const db = await getDb()
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT e.*, ec.name as category_name, ec.color as category_color
     FROM expenses e
     LEFT JOIN expense_categories ec ON e.category_id = ec.id
     ORDER BY e.date DESC, e.created_at DESC
     LIMIT 500`
  )
  return rows.map(mapRow)
}

export async function getExpensesByDateRange(
  startDate: string,
  endDate: string
): Promise<Expense[]> {
  const db = await getDb()
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT e.*, ec.name as category_name, ec.color as category_color
     FROM expenses e
     LEFT JOIN expense_categories ec ON e.category_id = ec.id
     WHERE e.date >= ? AND e.date <= ?
     ORDER BY e.date DESC, e.created_at DESC`,
    [startDate, endDate]
  )
  return rows.map(mapRow)
}

export async function getExpensesByCategory(categoryId: string): Promise<Expense[]> {
  const db = await getDb()
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT e.*, ec.name as category_name, ec.color as category_color
     FROM expenses e
     LEFT JOIN expense_categories ec ON e.category_id = ec.id
     WHERE e.category_id = ?
     ORDER BY e.date DESC, e.created_at DESC`,
    [categoryId]
  )
  return rows.map(mapRow)
}

export async function getExpenseById(id: string): Promise<Expense | null> {
  const db = await getDb()
  const row = await db.getFirstAsync<Record<string, unknown>>(
    `SELECT e.*, ec.name as category_name, ec.color as category_color
     FROM expenses e
     LEFT JOIN expense_categories ec ON e.category_id = ec.id
     WHERE e.id = ?`, [id]
  )
  return row ? mapRow(row) : null
}

// ── Create ────────────────────────────────────────────────────────────────────

export async function createExpense(data: {
  categoryId?: string
  amount: number
  description?: string
  reference?: string
  vendor?: string
  date: string
}): Promise<Expense> {
  await enforceSubscriptionOrThrow()
  await enforcePermission(await getCurrentRole(), PERMISSIONS.EXPENSES_MANAGE)
  const db = await getDb()
  const id = generateId()
  const now = new Date().toISOString()
  const employeeId = await resolveEmployeeId()
  await db.runAsync(
    `INSERT INTO expenses (id, category_id, amount, description, reference, vendor, date, status, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
    [id, data.categoryId || null, data.amount, data.description || null, data.reference || null, data.vendor || null, data.date, employeeId, now, now]
  )
  await queueSync('expenses', 'create', id)
  return (await getExpenseById(id))!
}

// ── Update ────────────────────────────────────────────────────────────────────

export async function updateExpense(
  id: string,
  data: {
    categoryId?: string
    amount?: number
    description?: string
    reference?: string
    vendor?: string
    date?: string
  }
): Promise<Expense | null> {
  await enforceSubscriptionOrThrow()
  await enforcePermission(await getCurrentRole(), PERMISSIONS.EXPENSES_MANAGE)
  const db = await getDb()
  const fields: string[] = []
  const values: (string | number | null)[] = []
  if (data.categoryId !== undefined) { fields.push('category_id = ?'); values.push(data.categoryId || null) }
  if (data.amount !== undefined) { fields.push('amount = ?'); values.push(data.amount) }
  if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description || null) }
  if (data.reference !== undefined) { fields.push('reference = ?'); values.push(data.reference || null) }
  if (data.vendor !== undefined) { fields.push('vendor = ?'); values.push(data.vendor || null) }
  if (data.date !== undefined) { fields.push('date = ?'); values.push(data.date) }
  if (fields.length === 0) return getExpenseById(id)
  const now = new Date().toISOString()
  fields.push('updated_at = ?')
  values.push(now)
  values.push(id)
  await db.runAsync(`UPDATE expenses SET ${fields.join(', ')} WHERE id = ?`, values)
  await queueSync('expenses', 'update', id)
  return getExpenseById(id)
}

// ── Status transitions ─────────────────────────────────────────────────────────

export async function approveExpense(id: string): Promise<Expense | null> {
  await enforceSubscriptionOrThrow()
  await enforcePermission(await getCurrentRole(), PERMISSIONS.EXPENSES_MANAGE)
  const db = await getDb()
  const now = new Date().toISOString()
  await db.runAsync(
    `UPDATE expenses SET status = 'approved', updated_at = ? WHERE id = ?`,
    [now, id]
  )
  await queueSync('expenses', 'update', id)
  return getExpenseById(id)
}

export async function markExpensePaid(id: string): Promise<Expense | null> {
  await enforceSubscriptionOrThrow()
  await enforcePermission(await getCurrentRole(), PERMISSIONS.EXPENSES_MANAGE)
  const db = await getDb()
  const now = new Date().toISOString()
  await db.runAsync(
    `UPDATE expenses SET status = 'paid', paid_at = ?, updated_at = ? WHERE id = ?`,
    [now, now, id]
  )
  await queueSync('expenses', 'update', id)
  return getExpenseById(id)
}

// ── Delete ────────────────────────────────────────────────────────────────────

export async function deleteExpense(id: string): Promise<void> {
  await enforceSubscriptionOrThrow()
  await enforcePermission(await getCurrentRole(), PERMISSIONS.EXPENSES_MANAGE)
  const db = await getDb()
  await db.runAsync('DELETE FROM expenses WHERE id = ?', [id])
  await queueSync('expenses', 'delete', id)
}

// ── Monthly summary ────────────────────────────────────────────────────────────

export async function getMonthlyExpenseTotal(year: number, month: number): Promise<number> {
  const db = await getDb()
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = `${year}-${String(month).padStart(2, '0')}-31`
  const row = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE date >= ? AND date <= ?`,
    [startDate, endDate]
  )
  return row?.total ?? 0
}

export async function getExpenseSummaryByCategory(
  year: number,
  month: number
): Promise<{ total: number; byCategory: Record<string, { amount: number; name: string; color: string }>; pendingCount: number }> {
  const db = await getDb()
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = `${year}-${String(month).padStart(2, '0')}-31`

  const totalRow = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE date >= ? AND date <= ?`,
    [startDate, endDate]
  )

  const pendingRow = await db.getFirstAsync<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM expenses WHERE date >= ? AND date <= ? AND status = 'pending'`,
    [startDate, endDate]
  )

  const catRows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT ec.id, ec.name, ec.color, COALESCE(SUM(e.amount), 0) as total
     FROM expense_categories ec
     LEFT JOIN expenses e ON e.category_id = ec.id AND e.date >= ? AND e.date <= ?
     WHERE ec.is_active = 1
     GROUP BY ec.id
     HAVING total > 0
     ORDER BY total DESC`,
    [startDate, endDate]
  )

  const byCategory: Record<string, { amount: number; name: string; color: string }> = {}
  for (const row of catRows) {
    const catId = String(row.id)
    byCategory[catId] = {
      amount: Number(row.total) || 0,
      name: String(row.name),
      color: String(row.color),
    }
  }

  return {
    total: totalRow?.total ?? 0,
    byCategory,
    pendingCount: pendingRow?.cnt ?? 0,
  }
}

// ── Row mapper ────────────────────────────────────────────────────────────────

function mapRow(row: Record<string, unknown>): Expense {
  return {
    id: String(row.id),
    categoryId: row.category_id ? String(row.category_id) : undefined,
    categoryName: row.category_name ? String(row.category_name) : undefined,
    categoryColor: row.category_color ? String(row.category_color) : undefined,
    amount: Number(row.amount) || 0,
    description: row.description ? String(row.description) : undefined,
    reference: row.reference ? String(row.reference) : undefined,
    vendor: row.vendor ? String(row.vendor) : undefined,
    date: String(row.date),
    status: (String(row.status || 'pending') as Expense['status']) || 'pending',
    paidAt: row.paid_at ? String(row.paid_at) : undefined,
    createdBy: row.created_by ? String(row.created_by) : undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}
