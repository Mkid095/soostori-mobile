// device-sync-event.ts — Phase 15: Device sync event factory
// Emits typed sync events for device mutations to be processed by sync queue
import { getDb } from '../lib/db'
import { generateId } from '../lib/formatters'
import type { SyncEvent } from '../lib/sync-protocol'

export type DeviceEventType = 'device.enrolled' | 'device.approved' | 'device.revoked' | 'device.primary_transferred'

export interface DeviceEventPayload {
  type: DeviceEventType
  deviceId: string
  shopId: string
  deviceName?: string
  deviceType?: string
  fromDeviceId?: string
  toDeviceId?: string
  timestamp: string
}

export async function enqueueDeviceSyncEvent(
  shopId: string,
  deviceId: string,
  eventType: DeviceEventType,
  extras?: Partial<Pick<DeviceEventPayload, 'deviceName' | 'deviceType' | 'fromDeviceId' | 'toDeviceId'>>,
): Promise<SyncEvent> {
  const db = await getDb()

  const seqRow = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT MAX(sequence_number) as max_seq FROM sync_events WHERE shop_id = ?',
    [shopId]
  )
  const nextSeq = (seqRow?.max_seq as number | null ?? 0) + 1

  const payload: DeviceEventPayload = {
    type: eventType,
    deviceId,
    shopId,
    timestamp: new Date().toISOString(),
    ...extras,
  }

  const event: SyncEvent = {
    id: generateId(),
    shopId,
    deviceId,
    sequenceNumber: nextSeq,
    eventType: 'DEVICE_DISCONNECTED',
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
