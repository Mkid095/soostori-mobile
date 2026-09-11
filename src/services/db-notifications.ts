// db-notifications.ts — Phase 17 extended notification store
//
// Extends the Phase 01 notifications table with Phase 17 fields:
//   eventType, businessId, userId, priority, readAt, notification_preferences
//
// Business logic lives in services, NOT in components.

import { getDb } from '../lib/db'
import type { AppNotification } from '../lib/types'
import { generateId } from '../lib/formatters'

// ── Types ─────────────────────────────────────────────────────────────────────

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent'

export type NotificationEventType =
  | 'sale.created' | 'sale.refunded'
  | 'debt.created' | 'debt.payment_recorded' | 'debt.settled'
  | 'expense.created' | 'expense.approved' | 'expense.paid'
  | 'inventory.low_stock' | 'inventory.received' | 'inventory.adjusted'
  | 'team.invitation_sent' | 'team.member_added' | 'team.role_changed'
  | 'device.enrolled' | 'device.approved' | 'device.revoked' | 'device.primary_changed'
  | 'commission.created' | 'commission.paid'
  | 'info' // legacy internal notification type

export interface NotificationPreferencesRow {
  id: string
  userId: string
  eventType: NotificationEventType
  channel: string
  enabled: boolean
}

// ── Schema ────────────────────────────────────────────────────────────────────

const PREFERENCES_TABLE = `
  CREATE TABLE IF NOT EXISTS notification_preferences (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL,
    event_type  TEXT NOT NULL,
    channel     TEXT NOT NULL,
    enabled     INTEGER DEFAULT 1,
    UNIQUE(user_id, event_type, channel)
  )
`

async function columnExists(db: Awaited<ReturnType<typeof getDb>>, table: string, col: string): Promise<boolean> {
  const row = await db.getFirstAsync<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM pragma_table_info(?) WHERE name = ?`,
    [table, col],
  )
  return (row?.cnt ?? 0) > 0
}

export async function ensureNotificationSchema(): Promise<void> {
  const db = await getDb()
  await db.runAsync(PREFERENCES_TABLE)

  // Phase 17: add new columns only if they don't exist
  const addColIfMissing = async (col: string, defaultVal: string) => {
    const exists = await columnExists(db, 'notifications', col)
    if (!exists) {
      try {
        await db.runAsync(`ALTER TABLE notifications ADD COLUMN ${col} ${defaultVal}`)
      } catch {
        // ignore — column added by concurrent call
      }
    }
  }

  await addColIfMissing('event_type', 'TEXT DEFAULT "info"')
  await addColIfMissing('business_id', 'TEXT')
  await addColIfMissing('user_id', 'TEXT')
  await addColIfMissing('priority', 'TEXT DEFAULT "normal"')
  await addColIfMissing('read_at', 'TEXT')
}

// ── Lazy init guard ──────────────────────────────────────────────────────────

let schemaEnsured = false

async function ensureSchema(): Promise<void> {
  if (schemaEnsured) return
  try {
    await ensureNotificationSchema()
    schemaEnsured = true
  } catch {
    // Schema may already be up-to-date — ignore
  }
}

// ── Row mapper ────────────────────────────────────────────────────────────────

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

// ── Read ─────────────────────────────────────────────────────────────────────

/** Get notifications ordered by created_at desc, limit 50. */
export async function getNotifications(limit = 50): Promise<AppNotification[]> {
  await ensureSchema()
  const db = await getDb()
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM notifications ORDER BY created_at DESC LIMIT ?',
    [limit],
  )
  return rows.map(mapRow)
}

/** Count unread notifications. */
export async function getUnreadCount(): Promise<number> {
  await ensureSchema()
  const db = await getDb()
  const row = await db.getFirstAsync<{ cnt: number }>(
    'SELECT COUNT(*) as cnt FROM notifications WHERE is_read = 0',
  )
  return row?.cnt ?? 0
}

/** Get all unread notifications. */
export async function getUnread(): Promise<AppNotification[]> {
  await ensureSchema()
  const db = await getDb()
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM notifications WHERE is_read = 0 ORDER BY created_at DESC',
  )
  return rows.map(mapRow)
}

/**
 * Get notifications filtered by eventType.
 * Used by useNotifications().getByType(eventType).
 */
export async function getByEventType(eventType: string): Promise<AppNotification[]> {
  await ensureSchema()
  const db = await getDb()
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM notifications WHERE event_type = ? ORDER BY created_at DESC',
    [eventType],
  )
  return rows.map(mapRow)
}

// ── Write ─────────────────────────────────────────────────────────────────────

/** Mark a single notification as read (sets is_read=1 and read_at timestamp). */
export async function markAsRead(id: string): Promise<void> {
  await ensureSchema()
  const db = await getDb()
  await db.runAsync(
    "UPDATE notifications SET is_read = 1, read_at = ? WHERE id = ?",
    [new Date().toISOString(), id],
  )
}

/** Mark all unread notifications as read. */
export async function markAllAsRead(): Promise<void> {
  await ensureSchema()
  const db = await getDb()
  await db.runAsync(
    "UPDATE notifications SET is_read = 1, read_at = ? WHERE is_read = 0",
    [new Date().toISOString()],
  )
}

/** Delete a notification by id. */
export async function deleteNotification(id: string): Promise<void> {
  await ensureSchema()
  const db = await getDb()
  await db.runAsync('DELETE FROM notifications WHERE id = ?', [id])
}

/**
 * Create a new notification.
 * Phase 17 signature: accepts eventType, businessId, userId, priority.
 */
export async function createNotification(data: {
  title: string
  type?: AppNotification['type']
  body?: string
  data?: Record<string, unknown>
  eventType?: NotificationEventType | string
  businessId?: string
  userId?: string
  priority?: NotificationPriority
}): Promise<AppNotification> {
  await ensureSchema()
  const db = await getDb()
  const id = generateId()
  const now = new Date().toISOString()
  const type = data.type ?? 'info'
  const eventType = data.eventType ?? 'info'
  const priority = data.priority ?? 'normal'

  await db.runAsync(
    `INSERT INTO notifications
       (id, type, title, body, data, is_read, created_at, event_type, business_id, user_id, priority, read_at)
     VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, NULL)`,
    [
      id,
      type,
      data.title,
      data.body ?? null,
      data.data ? JSON.stringify(data.data) : null,
      now,
      eventType,
      data.businessId ?? null,
      data.userId ?? null,
      priority,
    ],
  )
  const row = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM notifications WHERE id = ?',
    [id],
  )
  return mapRow(row!)
}

/** Phase 17 — low-stock convenience helper. */
export async function createLowStockNotification(product: {
  id: string
  name: string
  stockQuantity: number
  lowStockThreshold: number
}): Promise<void> {
  const db = await getDb()
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const existing = await db.getFirstAsync<{ id: string }>(
    `SELECT id FROM notifications
     WHERE event_type = 'inventory.low_stock'
       AND data LIKE ?
       AND is_read = 0
       AND created_at > ?`,
    [`%"productId":"${product.id}"%`, dayAgo],
  )
  if (existing) return

  await createNotification({
    type: 'low_stock',
    title: 'Low Stock Alert',
    body: `"${product.name}" is running low (${product.stockQuantity} left, threshold: ${product.lowStockThreshold})`,
    data: { productId: product.id, productName: product.name, stockQuantity: product.stockQuantity },
    eventType: 'inventory.low_stock',
    priority: 'high',
  })
}

// ── Preferences ───────────────────────────────────────────────────────────────

/** Get a user's notification preference for a channel + eventType. */
export async function getPreference(
  userId: string,
  eventType: string,
  channel: string,
): Promise<boolean> {
  await ensureSchema()
  const db = await getDb()
  const row = await db.getFirstAsync<{ enabled: number }>(
    'SELECT enabled FROM notification_preferences WHERE user_id = ? AND event_type = ? AND channel = ?',
    [userId, eventType, channel],
  )
  return row ? Boolean(row.enabled) : true // default: enabled
}

/** Set a user's notification preference for a channel + eventType. */
export async function setPreference(
  userId: string,
  eventType: string,
  channel: string,
  enabled: boolean,
): Promise<void> {
  await ensureSchema()
  const db = await getDb()
  await db.runAsync(
    `INSERT INTO notification_preferences (id, user_id, event_type, channel, enabled)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(user_id, event_type, channel) DO UPDATE SET enabled = ?`,
    [generateId(), userId, eventType, channel, enabled ? 1 : 0, enabled ? 1 : 0],
  )
}
