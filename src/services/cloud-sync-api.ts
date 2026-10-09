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

export async function cloudDownloadEvents(
  shopId: string,
  since?: string,
): Promise<SyncEvent[]> {
  // InstantDB doesn't support orderBy on queries, so filter + sort in-memory
  const result = await db.queryOnce({
    syncEvents: { $: { where: { shopId }, limit: 500 } },
  })
  const raw =
    (result.data.syncEvents as Array<Record<string, unknown>>) ?? []

  const sinceVal = since ?? ''
  const seen = new Set<string>()
  const filtered = raw
    .filter(cev => {
      const ts = String(cev.serverReceivedAt ?? cev.syncedAt ?? '')
      if (ts <= sinceVal) return false
      const key = String(cev.idempotencyKey ?? cev.id ?? '')
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((a, b) =>
      String(a.serverReceivedAt ?? a.syncedAt ?? '').localeCompare(
        String(b.serverReceivedAt ?? b.syncedAt ?? ''),
      ),
    )
    .slice(0, 100)

  return filtered as unknown as SyncEvent[]
}

export async function cloudPing(): Promise<{ ok: boolean; serverTime: string }> {
  try {
    await db.queryOnce({ shops: { $: { limit: 1 } } })
    return { ok: true, serverTime: new Date().toISOString() }
  } catch {
    return { ok: false, serverTime: new Date().toISOString() }
  }
}
