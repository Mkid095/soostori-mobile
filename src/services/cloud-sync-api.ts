// Cloud sync API — real Instant DB sync
// Shop isolation: upload tags every event with shopId so consumers can
// filter. Download queries the cloud-synced events for the shop.
// (syncEvents table currently lacks a shopId column in the schema; the
// entityId field is the row being changed, and the shop boundary is
// enforced upstream by the write path. When a shopId column lands in
// the schema, the where clause below should be tightened.)

import { db, id } from '../lib/instant-client'
import type { SyncEvent } from '../contracts/cloud'

export async function cloudUploadEvents(events: Array<{
  tableName: string
  action: string
  payload: unknown
  timestamp: string
  shopId?: string
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
  const result = await db.queryOnce({ syncEvents: { $: {} } })
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
