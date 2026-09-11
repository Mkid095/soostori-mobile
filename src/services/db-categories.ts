// Category CRUD operations — business logic in services, NOT components

import AsyncStorage from '@react-native-async-storage/async-storage'
import { getDb } from '../lib/db'
import type { Category } from '../lib/types'
import { generateId } from '../lib/formatters'
import { queueSync } from './sync-queue-helper'
import { enforcePermission, PERMISSIONS } from './sdk-bridge/rbac'
import { logAudit } from './db-audit'
import { enforceSubscriptionOrThrow } from './sdk-bridge/subscription-gate'
import { getCurrentRole, getCurrentShopId } from './session-helper'
import { defaultSyncEngine } from '@soostori/contracts'
import { fromLocalCategory } from '../lib/contracts-mapper'
import { triggerSync } from './mobile-sync-service'

async function resolveShopId(): Promise<string> {
  const stored = await AsyncStorage.getItem('@soostori:shopId')
  if (!stored) return 'default'
  return stored
}

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
  enqueueCategorySyncEvent(id, 'create')
    .then(() => triggerSync())
    .catch(() => { /* swallow — local DB is source of truth */ })
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

export async function updateCategory(
  id: string,
  data: { name?: string; color?: string },
): Promise<void> {
  await enforceSubscriptionOrThrow()
  await enforcePermission(await getCurrentRole(), PERMISSIONS.INVENTORY_EDIT)
  const shopId = await resolveShopId()
  const db = await getDb()
  const now = new Date().toISOString()
  const sets: string[] = ['updated_at = ?']
  const values: (string | number | null)[] = [now]

  if (data.name !== undefined) {
    sets.push('name = ?')
    values.push(data.name)
  }
  if (data.color !== undefined) {
    sets.push('color = ?')
    values.push(data.color)
  }

  if (sets.length === 1) return // nothing to update

  values.push(id)
  await db.runAsync(`UPDATE categories SET ${sets.join(', ')} WHERE id = ?`, values)

  const { logAudit } = await import('./db-audit')
  await logAudit(shopId, 'CATEGORY_UPDATED', 'category', id, undefined, undefined,
    undefined, JSON.stringify(data))

  await queueSync('categories', 'update', id)
  enqueueCategorySyncEvent(id, 'update')
    .then(() => triggerSync())
    .catch(() => { /* swallow — local DB is source of truth */ })
}

export async function deleteCategory(id: string): Promise<void> {
  await enforceSubscriptionOrThrow()
  await enforcePermission(await getCurrentRole(), PERMISSIONS.INVENTORY_EDIT)
  const shopId = await resolveShopId()
  const db = await getDb()

  // Check if any active products reference this category
  const productRows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT id FROM products WHERE category_id = ? AND is_active = 1 LIMIT 1',
    [id],
  )

  if (productRows.length > 0) {
    // Products exist — clear the category reference on them before soft-deleting the category
    await db.runAsync(
      'UPDATE products SET category_id = NULL, category_name = NULL, category_color = NULL, updated_at = ? WHERE category_id = ?',
      [new Date().toISOString(), id],
    )
  }

  await db.runAsync(
    'UPDATE categories SET is_active = 0, updated_at = ? WHERE id = ?',
    [new Date().toISOString(), id],
  )

  const { logAudit } = await import('./db-audit')
  await logAudit(shopId, 'CATEGORY_DELETED', 'category', id)

  await queueSync('categories', 'delete', id)
  enqueueCategorySyncEvent(id, 'delete')
    .then(() => triggerSync())
    .catch(() => { /* swallow — local DB is source of truth */ })
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

async function enqueueCategorySyncEvent(
  categoryId: string,
  operation: 'create' | 'update' | 'delete',
): Promise<void> {
  const db = await getDb()
  const businessId = await getCurrentShopId()
  if (!businessId) return
  if (operation !== 'delete') {
    const row = await db.getFirstAsync<Record<string, unknown>>(
      'SELECT * FROM categories WHERE id = ?', [categoryId],
    )
    if (!row) return
    const entity = fromLocalCategory(row)
    await defaultSyncEngine.enqueue({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      id: generateId() as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      idempotencyKey: ((entity as { idempotencyKey?: string }).idempotencyKey ?? categoryId) as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      businessId: String(entity.businessId) as any,
      entityKind: 'category',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      entityId: String(entity.id) as any,
      operation,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      originatingDeviceId: String(entity.businessId) as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      originatingEmployeeId: 'system' as any,
      clientSequence: Date.now(),
      clientCreatedAt: entity.updatedAt,
      entityVersion: entity.version,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      payload: entity as any,
      state: 'pending',
    })
  } else {
    await defaultSyncEngine.enqueue({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      id: generateId() as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      idempotencyKey: categoryId as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      businessId: businessId as any,
      entityKind: 'category',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      entityId: categoryId as any,
      operation: 'delete',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      originatingDeviceId: businessId as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      originatingEmployeeId: 'system' as any,
      clientSequence: Date.now(),
      clientCreatedAt: new Date().toISOString(),
      entityVersion: 1,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      payload: { id: categoryId } as any,
      state: 'pending',
    })
  }
}

