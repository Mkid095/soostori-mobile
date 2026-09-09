// Cloud sync API — real Instant DB sync
// Shop isolation: upload tags every event with shopId so consumers can
// filter. Download queries only events belonging to the given shopId.

import { db, id } from '../lib/instant-client'
import type { SyncEvent } from '../contracts/cloud'

export async function cloudUploadEvents(events: Array<{
  tableName: string
  action: string
  payload: unknown
  timestamp: string
  shopId: string
}>): Promise<void> {
  const operations = events.map((e) => {
    const eventId = id()
    const now = new Date().toISOString()
    return db.tx.syncEvents[eventId].create({
      id: eventId,
      shopId: e.shopId,
      entityId: eventId,
      entity: e.tableName,
      operation: e.action,
      payload: e.payload,
      syncedAt: now,
      version: 1,
      idempotencyKey: eventId,
      timestamp: e.timestamp,
      sequenceNumber: 0,
      deviceId: '',
    })
  })
  await db.transact(operations)
}

export async function cloudDownloadEvents(shopId: string): Promise<SyncEvent[]> {
  const result = await db.queryOnce({
    syncEvents: {
      $: {
        where: { shopId },
      },
    },
  })
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
