// src/services/sdk-bridge/sdk-event-bus.ts
//
// Mobile SDK event integration.
//
// Wires @soostori/events into the local mutation path. Every mobile mutation
// (sale created, stock adjusted, customer updated, debt payment recorded, etc.)
// publishes a canonical SoostoriEvent on the SDK bus. In-process consumers
// (audit recorder, notifications, dashboard) subscribe via this bridge.
//
// Cross-device delivery still uses the local sync_queue (LAN/cloud). The
// SDK bus is the in-process fan-out for UI reactions only.

import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  getEventBus,
  createEvent,
  type SoostoriEvent,
  type SoostoriEventName,
  type EventPayloadMap,
  type EventPayload,
} from '@soostori/events'
import {
  asShopId,
  asDeviceId,
  asUserId,
  newId,
  type ShopId,
  type DeviceId,
} from '@soostori/core'

const SHOP_KEY = '@soostori:shopId'
const DEVICE_KEY = '@soostori:deviceId'
const EMPLOYEE_KEY = '@soostori:employeeId'
const DEVICE_OWNER_KEY = '@soostori:deviceOwnerId'

/**
 * Publish a canonical SDK event with the standard mobile context.
 *
 * The envelope is consumed by:
 *   - @soostori/audit.AuditRecorder (mounted separately)
 *   - @soostori/notifications fan-out (when the SDK package is installed)
 *   - any local UI subscription registered via getEventBus()
 *
 * Returns the created event for callers that want the id (e.g. for the
 * local sync_queue payload).
 */
export async function publishSdkEvent<K extends keyof EventPayloadMap>(args: {
  name: K
  entity: string
  entityId: string
  payload: EventPayload<K>
  userId?: string | null
  source?: 'local' | 'lan' | 'cloud' | 'system'
}): Promise<SoostoriEvent> {
  const [shopIdRaw, deviceIdRaw, employeeIdRaw] = await Promise.all([
    AsyncStorage.getItem(SHOP_KEY),
    AsyncStorage.getItem(DEVICE_KEY),
    AsyncStorage.getItem(EMPLOYEE_KEY),
  ])

  // No active business context → ignore emissions so they never fan out
  // misrouted events.
  if (!shopIdRaw || !deviceIdRaw) {
    const bus = getEventBus()
    const evt = buildLocalEvent(args.name, args.entity, args.entityId, args.payload)
    await bus.publish(evt)
    return evt
  }

  const ownerRaw = await AsyncStorage.getItem(DEVICE_OWNER_KEY)
  const userId = args.userId ?? employeeIdRaw ?? ownerRaw

  const event = createEvent({
    name: args.name,
    shopId: asShopId(shopIdRaw),
    deviceId: asDeviceId(deviceIdRaw),
    userId: userId ? asUserId(userId) : undefined,
    entity: args.entity,
    entityId: args.entityId,
    payload: args.payload,
    source: args.source ?? 'local',
  })

  await getEventBus().publish(event)
  return event
}

/** Local-only event used when no shop/device context is available yet. */
function buildLocalEvent(
  name: SoostoriEventName,
  entity: string,
  entityId: string,
  payload: unknown,
): SoostoriEvent {
  const now = new Date().toISOString()
  return {
    id: newId() as SoostoriEvent['id'],
    name,
    version: 1,
    deviceId: 'local' as unknown as DeviceId,
    userId: undefined,
    shopId: 'local' as unknown as ShopId,
    timestamp: now,
    sequence: 0,
    idempotencyKey: newId() as SoostoriEvent['idempotencyKey'],
    entityId,
    entity,
    source: 'local',
    payload: payload as SoostoriEvent['payload'],
  }
}

/** Convenience helper for the audit recorder — clear all subscriptions. */
export function resetSdkEventBus(): void {
  getEventBus().clear()
}
