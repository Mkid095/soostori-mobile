// Expense CRUD operations — business logic in services, NOT components

import { getDb } from '../lib/db'
import type { Expense, ExpenseCategory } from '../lib/types'
import { generateId } from '../lib/formatters'
import { queueSync } from './sync-queue-helper'

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

export async function createExpense(data: {
  categoryId?: string
  amount: number
  description?: string
  reference?: string
  date: string
}): Promise<Expense> {
  const db = await getDb()
  const id = generateId()
  const now = new Date().toISOString()
  await db.runAsync(
    `INSERT INTO expenses (id, category_id, amount, description, reference, date, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, data.categoryId || null, data.amount, data.description || null, data.reference || null, data.date, now, now]
  )
  await queueSync('expenses', 'create', id)
  return (await getExpenseById(id))!
}

export async function updateExpense(
  id: string,
  data: {
    categoryId?: string
    amount?: number
    description?: string
    reference?: string
    date?: string
  }
): Promise<Expense | null> {
  const db = await getDb()
  const fields: string[] = []
  const values: (string | number | null)[] = []
  if (data.categoryId !== undefined) { fields.push('category_id = ?'); values.push(data.categoryId || null) }
  if (data.amount !== undefined) { fields.push('amount = ?'); values.push(data.amount) }
  if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description || null) }
  if (data.reference !== undefined) { fields.push('reference = ?'); values.push(data.reference || null) }
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

export async function deleteExpense(id: string): Promise<void> {
  const db = await getDb()
  await db.runAsync('DELETE FROM expenses WHERE id = ?', [id])
  await queueSync('expenses', 'delete', id)
}

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

function mapRow(row: Record<string, unknown>): Expense {
  return {
    id: String(row.id),
    categoryId: row.category_id ? String(row.category_id) : undefined,
    categoryName: row.category_name ? String(row.category_name) : undefined,
    categoryColor: row.category_color ? String(row.category_color) : undefined,
    amount: Number(row.amount) || 0,
    description: row.description ? String(row.description) : undefined,
    reference: row.reference ? String(row.reference) : undefined,
    date: String(row.date),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}
