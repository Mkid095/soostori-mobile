// Category CRUD operations — business logic in services, NOT components

import { getDb } from '../lib/db'
import type { Category } from '../lib/types'
import { generateId } from '../lib/formatters'
import { queueSync } from './sync-queue-helper'

export async function getAllCategories(): Promise<Category[]> {
  const db = await getDb()
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM categories WHERE is_active = 1 ORDER BY name ASC'
  )
  return rows.map(mapRow)
}

export async function createCategory(data: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Promise<Category> {
  const db = await getDb()
  const id = generateId()
  const now = new Date().toISOString()

  await db.runAsync(
    `INSERT INTO categories (id, name, color, description, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, data.name, data.color, data.description || null, data.isActive ? 1 : 0, now, now]
  )

  await queueSync('categories', 'create', id)
  return {
    id,
    name: data.name,
    color: data.color,
    description: data.description,
    isActive: data.isActive,
    createdAt: now,
    updatedAt: now,
  }
}

function mapRow(row: Record<string, unknown>): Category {
  return {
    id: String(row.id),
    name: String(row.name),
    color: String(row.color || '#f97316'),
    description: row.description ? String(row.description) : undefined,
    isActive: Boolean(row.is_active),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

