// Expense category CRUD operations — business logic in services, NOT components

import { getDb } from '../lib/db'
import type { ExpenseCategory } from '../lib/types'
import { generateId } from '../lib/formatters'
import { queueSync } from './sync-queue-helper'

export async function getAllExpenseCategories(): Promise<ExpenseCategory[]> {
  const db = await getDb()
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM expense_categories WHERE is_active = 1 ORDER BY name ASC'
  )
  return rows.map(mapRow)
}

export async function getExpenseCategoryById(id: string): Promise<ExpenseCategory | null> {
  const db = await getDb()
  const row = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM expense_categories WHERE id = ?', [id]
  )
  return row ? mapRow(row) : null
}

export async function createExpenseCategory(data: {
  name: string
  color?: string
  icon?: string
}): Promise<ExpenseCategory> {
  const db = await getDb()
  const id = generateId()
  const now = new Date().toISOString()
  await db.runAsync(
    `INSERT INTO expense_categories (id, name, color, icon, is_active, created_at)
     VALUES (?, ?, ?, ?, 1, ?)`,
    [id, data.name, data.color || '#6B7280', data.icon || 'receipt', now]
  )
  await queueSync('expense_categories', 'create', id)
  return (await getExpenseCategoryById(id))!
}

export async function updateExpenseCategory(
  id: string,
  data: { name?: string; color?: string; icon?: string }
): Promise<ExpenseCategory | null> {
  const db = await getDb()
  const fields: string[] = []
  const values: (string | number | null)[] = []
  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name) }
  if (data.color !== undefined) { fields.push('color = ?'); values.push(data.color) }
  if (data.icon !== undefined) { fields.push('icon = ?'); values.push(data.icon) }
  if (fields.length === 0) return getExpenseCategoryById(id)
  const now = new Date().toISOString()
  fields.push('updated_at = ?')
  values.push(now)
  values.push(id)
  await db.runAsync(`UPDATE expense_categories SET ${fields.join(', ')} WHERE id = ?`, values)
  await queueSync('expense_categories', 'update', id)
  return getExpenseCategoryById(id)
}

export async function deleteExpenseCategory(id: string): Promise<void> {
  const db = await getDb()
  await db.runAsync(
    'UPDATE expense_categories SET is_active = 0 WHERE id = ?', [id]
  )
  await queueSync('expense_categories', 'update', id)
}

function mapRow(row: Record<string, unknown>): ExpenseCategory {
  return {
    id: String(row.id),
    name: String(row.name || ''),
    color: String(row.color || '#6B7280'),
    icon: String(row.icon || 'receipt'),
    isActive: Boolean(row.is_active),
    createdAt: String(row.created_at),
  }
}
