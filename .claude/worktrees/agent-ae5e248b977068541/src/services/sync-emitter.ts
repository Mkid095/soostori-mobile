// Sync event emitter — desktop-agent
// Emits typed events with monotonically increasing sequence numbers per shop
import { getDb } from '../lib/db'
import type { SyncEvent, SyncEventType, SyncPayload } from '../lib/sync-protocol'
import { generateId } from '../lib/formatters'

export async function emitEvent(
  shopId: string,
  deviceId: string,
  eventType: SyncEventType,
  payload: SyncPayload,
): Promise<SyncEvent> {
  const db = await getDb()

  // Get next sequence number for this shop (monotonic)
  const seqRow = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT MAX(sequence_number) as max_seq FROM sync_events WHERE shop_id = ?',
    [shopId]
  )
  const nextSeq = (seqRow?.max_seq as number | null ?? 0) + 1

  const event: SyncEvent = {
    id: generateId(),
    shopId,
    deviceId,
    sequenceNumber: nextSeq,
    eventType,
    payload: JSON.stringify(payload),
    timestamp: new Date().toISOString(),
  }

  await db.runAsync(
    `INSERT INTO sync_events (id, shop_id, device_id, sequence_number, event_type, payload, timestamp)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [event.id, event.shopId, event.deviceId, event.sequenceNumber, event.eventType, event.payload, event.timestamp]
  )

  return event
}

export async function getLatestSeq(shopId: string): Promise<number> {
  const db = await getDb()
  const row = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT MAX(sequence_number) as max_seq FROM sync_events WHERE shop_id = ?',
    [shopId]
  )
  return (row?.max_seq as number | null) ?? 0
}

export async function getEventsSince(shopId: string, sequenceNumber: number): Promise<SyncEvent[]> {
  const db = await getDb()
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM sync_events WHERE shop_id = ? AND sequence_number > ? ORDER BY sequence_number ASC',
    [shopId, sequenceNumber]
  )
  return rows.map(row => ({
    id: String(row.id),
    shopId: String(row.shop_id),
    deviceId: String(row.device_id),
    sequenceNumber: Number(row.sequence_number),
    eventType: String(row.event_type) as SyncEventType,
    payload: String(row.payload),
    timestamp: String(row.timestamp),
  }))
}
