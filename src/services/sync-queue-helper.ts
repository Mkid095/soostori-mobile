// Sync queue helper — insert into sync_queue table for future backend sync
// Phase 4 — retry with exponential backoff (1min, 5min, 15min)

import { getDb } from '../lib/db'
import { generateId } from '../lib/formatters'
import AsyncStorage from '@react-native-async-storage/async-storage'

export async function queueSync(
  tableName: string,
  action: 'create' | 'update' | 'delete',
  recordId: string,
  shopId?: string,
): Promise<void> {
  const db = await getDb()
  const id = generateId()
  const now = Date.now()
  const actualShopId = shopId || (await AsyncStorage.getItem('@soostori:shopId')) || 'unknown'
  await db.runAsync(
    'INSERT INTO sync_queue (id, table_name, action, payload, status, created_at, retry_count) VALUES (?, ?, ?, ?, ?, ?, 0)',
    [id, tableName, action, JSON.stringify({ id: recordId, shopId: actualShopId }), 'pending', now]
  )
}

export async function getPendingSyncCount(): Promise<number> {
  const db = await getDb()
  const row = await db.getFirstAsync<{ cnt: number }>(
    "SELECT COUNT(*) as cnt FROM sync_queue WHERE status = 'pending'"
  )
  return row?.cnt ?? 0
}

export async function getSyncStatus(): Promise<{ pending: number; failed: number }> {
  const db = await getDb()
  const pending = await db.getFirstAsync<{ cnt: number }>(
    "SELECT COUNT(*) as cnt FROM sync_queue WHERE status = 'pending'"
  )
  const failed = await db.getFirstAsync<{ cnt: number }>(
    "SELECT COUNT(*) as cnt FROM sync_queue WHERE status = 'failed'"
  )
  return { pending: pending?.cnt ?? 0, failed: failed?.cnt ?? 0 }
}

const RETRY_DELAYS_MS = [60_000, 300_000, 900_000] // 1min, 5min, 15min
const MAX_RETRIES = 3

export async function markSyncEventRetryable(eventId: string): Promise<void> {
  const db = await getDb()
  const row = await db.getFirstAsync<{ retry_count: number }>(
    'SELECT retry_count FROM sync_queue WHERE id = ?', [eventId]
  )
  const retryCount = row ? Number(row.retry_count) || 0 : 0
  const nextRetry = retryCount + 1
  if (nextRetry >= MAX_RETRIES) {
    await db.runAsync(
      "UPDATE sync_queue SET status = 'failed', retry_count = ? WHERE id = ?",
      [nextRetry, eventId]
    )
    return
  }
  const delayMs = RETRY_DELAYS_MS[nextRetry] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1]
  const retryAt = Date.now() + delayMs
  await db.runAsync(
    "UPDATE sync_queue SET status = 'pending', retry_count = ?, retry_at = ? WHERE id = ?",
    [nextRetry, retryAt, eventId]
  )
}

export async function getNextRetryableEvent(): Promise<string | null> {
  const db = await getDb()
  const row = await db.getFirstAsync<{ id: string }>(
    "SELECT id FROM sync_queue WHERE status = 'pending' AND retry_count > 0 AND retry_at IS NOT NULL AND retry_at <= ? ORDER BY retry_at ASC LIMIT 1",
    [Date.now()]
  )
  return row ? String(row.id) : null
}
