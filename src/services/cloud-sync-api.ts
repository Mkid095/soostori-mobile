// src/services/cloud-sync-api.ts — Real Instant DB sync API
import { db, id } from '../lib/instant-client'

export async function cloudUploadEvents(events: Array<{
  tableName: string
  action: string
  payload: unknown
  timestamp: string
}>): Promise<void> {
  const chunks = events.map(e => {
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
  await db.transact(chunks)
}

export async function cloudDownloadEvents(): Promise<Array<{
  id: string
  entityId: string
  entity: string
  operation: string
  payload: unknown
  syncedAt: string
}>> {
  const result = await db.queryOnce({
    syncEvents: { $: { where: { syncedAt: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() } } } }
  })
  return result.data.syncEvents || []
}

export async function cloudPing(): Promise<{ ok: boolean; serverTime: string }> {
  try {
    await db.queryOnce({ shops: {} })
    return { ok: true, serverTime: new Date().toISOString() }
  } catch {
    return { ok: false, serverTime: new Date().toISOString() }
  }
}
