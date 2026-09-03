// Sync queue processor — uploads pending local events to cloud
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getDb } from '../lib/db'
import { getSyncState, updateSyncState } from './db-sync-state'
import { markSyncEventRetryable } from './sync-queue-helper'

const SYNC_INTERVAL_MS = 60_000 // 1 minute

interface QueuedEvent {
  id: string
  tableName: string
  action: string
  payload: string
  status: string
  createdAt: number
}

export async function getQueuedEvents(limit = 50): Promise<QueuedEvent[]> {
  const db = await getDb()
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM sync_queue WHERE status = 'pending' ORDER BY created_at ASC LIMIT ?`,
    [limit]
  )
  return rows.map(r => ({
    id: String(r.id),
    tableName: String(r.table_name),
    action: String(r.action),
    payload: String(r.payload),
    status: String(r.status),
    createdAt: Number(r.created_at),
  }))
}

export async function markEventSynced(eventId: string): Promise<void> {
  const db = await getDb()
  await db.runAsync(
    `UPDATE sync_queue SET status = 'synced', synced_at = ? WHERE id = ?`,
    [Date.now(), eventId]
  )
}

export async function markEventFailed(eventId: string): Promise<void> {
  const db = await getDb()
  await db.runAsync(
    `UPDATE sync_queue SET status = 'failed' WHERE id = ?`,
    [eventId]
  )
}

async function shouldSync(): Promise<boolean> {
  const state = await getSyncState()
  if (!state.lastCloudSyncAt) return true
  const elapsed = Date.now() - new Date(state.lastCloudSyncAt).getTime()
  return elapsed >= SYNC_INTERVAL_MS
}

async function uploadEventBatch(events: QueuedEvent[]): Promise<void> {
  const { cloudUploadEvents } = await import('./cloud-sync-api')
  await cloudUploadEvents(events.map(e => ({
    id: e.id,
    tableName: e.tableName,
    action: e.action,
    payload: JSON.parse(e.payload),
    timestamp: new Date(e.createdAt).toISOString(),
  })))
}

export async function processSyncQueue(): Promise<{ processed: number; failed: number }> {
  // Try sync regardless of grace window — server may grant transient access
  const events = await getQueuedEvents(50)
  if (events.length === 0) return { processed: 0, failed: 0 }

  let processed = 0
  let failed = 0

  for (const event of events) {
    try {
      await uploadEventBatch([event])
      await markEventSynced(event.id)
      processed++
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      // If unauthorized, don't keep retrying for 3 minutes
      if (message.includes('401') || message.includes('UNAUTHORIZED')) {
        await markEventFailed(event.id)
        failed++
        // Clear entitlement cache to force re-auth on next attempt
        await AsyncStorage.removeItem('@soostori:entitlement')
        await AsyncStorage.removeItem('@soostori:verificationDeadline')
      } else {
        // Network or other errors → leave as pending for retry
        // Use the retry backoff helper
        await markSyncEventRetryable(event.id)
      }
    }
  }

  await updateSyncState({ lastCloudSyncAt: new Date().toISOString() })

  return { processed, failed }
}

let syncTimer: ReturnType<typeof setInterval> | null = null

export function startSyncWorker(): void {
  if (syncTimer) return
  syncTimer = setInterval(async () => {
    const shouldRun = await shouldSync()
    if (shouldRun) {
      try {
        await processSyncQueue()
      } catch { /* non-fatal */ }
    }
  }, SYNC_INTERVAL_MS)
}

export function stopSyncWorker(): void {
  if (syncTimer) {
    clearInterval(syncTimer)
    syncTimer = null
  }
}
