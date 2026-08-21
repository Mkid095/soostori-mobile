// Sync queue helper — insert into sync_queue table for future backend sync

import { getDb } from '../lib/db'
import { generateId } from '../lib/formatters'

export async function queueSync(
  tableName: string,
  action: 'create' | 'update' | 'delete',
  recordId: string
): Promise<void> {
  const db = await getDb()
  const id = generateId()
  const now = Date.now()
  await db.runAsync(
    'INSERT INTO sync_queue (id, table_name, action, payload, status, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, tableName, action, JSON.stringify({ id: recordId }), 'pending', now]
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
