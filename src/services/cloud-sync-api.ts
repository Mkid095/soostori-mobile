// Cloud sync API — real Instant DB sync
import { db, id } from '../lib/instant-client'
import type { SyncEvent } from '../contracts/cloud'

export async function cloudUploadEvents(events: Array<{
  tableName: string
  action: string
  payload: unknown
  timestamp: string
}>): Promise<void> {
  const operations = events.map((e) => {
    const eventId = id()
    return db.tx.syncEvents[eventId].create({
      id: eventId,
      entityId: eventId,
      entity: e.tableName,
      operation: e.action,
      payload: e.payload,
      syncedAt: e.timestamp,
    })
  })
  await db.transact(operations)
}

export async function cloudDownloadEvents(): Promise<SyncEvent[]> {
  const result = await db.queryOnce({ syncEvents: {} })
  return (result.data.syncEvents as SyncEvent[]) || []
}

export async function cloudPing(): Promise<{ ok: boolean; serverTime: string }> {
  try {
    await db.queryOnce({ shops: { $: { limit: 1 } } })
    return { ok: true, serverTime: new Date().toISOString() }
  } catch {
    return { ok: false, serverTime: new Date().toISOString() }
  }
}
