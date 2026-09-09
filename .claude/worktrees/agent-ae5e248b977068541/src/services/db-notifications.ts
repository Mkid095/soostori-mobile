// Notification CRUD operations — business logic in services, NOT components

import { getDb } from '../lib/db'
import type { AppNotification } from '../lib/types'
import { generateId } from '../lib/formatters'

function mapRow(row: Record<string, unknown>): AppNotification {
  return {
    id: row.id as string,
    type: row.type as AppNotification['type'],
    title: row.title as string,
    body: row.body as string | undefined,
    data: row.data ? (JSON.parse(row.data as string) as Record<string, unknown>) : undefined,
    isRead: Boolean(row.is_read),
    createdAt: row.created_at as string,
  }
}

export async function getNotifications(limit = 50): Promise<AppNotification[]> {
  const db = await getDb()
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM notifications ORDER BY created_at DESC LIMIT ?',
    [limit]
  )
  return rows.map(mapRow)
}

export async function getUnreadCount(): Promise<number> {
  const db = await getDb()
  const row = await db.getFirstAsync<{ cnt: number }>(
    'SELECT COUNT(*) as cnt FROM notifications WHERE is_read = 0'
  )
  return row?.cnt ?? 0
}

export async function markAsRead(id: string): Promise<void> {
  const db = await getDb()
  await db.runAsync('UPDATE notifications SET is_read = 1 WHERE id = ?', [id])
}

export async function markAllAsRead(): Promise<void> {
  const db = await getDb()
  await db.runAsync('UPDATE notifications SET is_read = 1 WHERE is_read = 0')
}

export async function deleteNotification(id: string): Promise<void> {
  const db = await getDb()
  await db.runAsync('DELETE FROM notifications WHERE id = ?', [id])
}

export async function createNotification(data: {
  type: AppNotification['type']
  title: string
  body?: string
  data?: Record<string, unknown>
}): Promise<AppNotification> {
  const db = await getDb()
  const id = generateId()
  const now = new Date().toISOString()
  await db.runAsync(
    'INSERT INTO notifications (id, type, title, body, data, is_read, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)',
    [id, data.type, data.title, data.body ?? null, data.data ? JSON.stringify(data.data) : null, now]
  )
  const row = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM notifications WHERE id = ?', [id]
  )
  return mapRow(row!)
}

export async function createLowStockNotification(product: {
  id: string
  name: string
  stockQuantity: number
  lowStockThreshold: number
}): Promise<void> {
  // Only notify if below threshold and no unread notification for this product in last 24h
  const db = await getDb()
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const existing = await db.getFirstAsync<{ id: string }>(
    `SELECT id FROM notifications
     WHERE type = 'low_stock'
       AND data LIKE ?
       AND is_read = 0
       AND created_at > ?`,
    [`%"productId":"${product.id}"%`, dayAgo]
  )
  if (existing) return

  await createNotification({
    type: 'low_stock',
    title: 'Low Stock Alert',
    body: `"${product.name}" is running low (${product.stockQuantity} left, threshold: ${product.lowStockThreshold})`,
    data: { productId: product.id, productName: product.name, stockQuantity: product.stockQuantity },
  })
}
