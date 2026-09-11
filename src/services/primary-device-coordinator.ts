// primary-device-coordinator.ts — Phase 15: Mobile PrimaryDeviceCoordinator integration
// Wraps @soostori/devices PrimaryDeviceCoordinator with local state persistence
import AsyncStorage from '@react-native-async-storage/async-storage'
import { PrimaryDeviceCoordinator } from '@soostori/devices'
import type { PrimaryDeviceState, Heartbeat } from '@soostori/devices'
import { asShopId } from '@soostori/core'
import type { DeviceType } from '../lib/sync-protocol'
import { listDevices, updateDeviceLastSeen } from './db-devices'

const DEVICE_ID_KEY = '@soostori:deviceId'
const SHOP_ID_KEY = '@soostori:shopId'

let coordinator: PrimaryDeviceCoordinator | null = null

async function getLocalDeviceId(): Promise<string> {
  const id = await AsyncStorage.getItem(DEVICE_ID_KEY)
  if (!id) throw new Error('No local device ID')
  return id
}

export async function getCoordinator(): Promise<PrimaryDeviceCoordinator> {
  if (coordinator) return coordinator

  const [deviceId, shopId] = await Promise.all([
    getLocalDeviceId(),
    AsyncStorage.getItem(SHOP_ID_KEY),
  ])

  coordinator = new PrimaryDeviceCoordinator({
    shopId: asShopId(shopId ?? 'shop-default') as never,
    deviceId: deviceId as never,
    config: { freshnessMs: 30_000, lostGraceMs: 90_000 },
  })

  return coordinator
}

/**
 * Ingest a heartbeat from any device (including local).
 * Call this when receiving a heartbeat broadcast from LAN.
 */
export async function ingestHeartbeat(hb: Omit<Heartbeat, 'deviceId' | 'shopId'> & { deviceId: string; shopId: string }): Promise<void> {
  const coord = await getCoordinator()
  coord.ingestHeartbeat(hb as Heartbeat)
}

/**
 * Tick the coordinator — updates stale/online/lost state.
 * Call periodically (e.g. every 10s).
 */
export async function tickCoordinator(): Promise<void> {
  const coord = await getCoordinator()
  coord.tick()
}

/**
 * Get current primary device state for this shop.
 */
export async function getPrimaryState(): Promise<PrimaryDeviceState> {
  const coord = await getCoordinator()
  return coord.getPrimaryState()
}

/**
 * Check if the local device is the current primary.
 */
export async function isLocalPrimary(): Promise<boolean> {
  const coord = await getCoordinator()
  return coord.isLocalPrimary()
}

/**
 * Check if the local device can authorize stock operations.
 * Returns true when primary is healthy (online or within grace period).
 */
export async function canAuthorStockOps(): Promise<boolean> {
  const coord = await getCoordinator()
  return coord.canAuthorStockOps()
}

/**
 * Transfer primary role to another device.
 * Updates local is_primary flag via db-devices service.
 */
export async function transferPrimary(toDeviceId: string): Promise<void> {
  const { transferPrimary: dbTransfer } = await import('./db-devices')
  await dbTransfer(toDeviceId)

  const [deviceId, shopId] = await Promise.all([
    getLocalDeviceId(),
    AsyncStorage.getItem(SHOP_ID_KEY),
  ])

  const coord = await getCoordinator()
  coord.transferPrimary(toDeviceId as never, deviceId as never)
}

/**
 * Send local heartbeat — call every 5s on primary, every 30s on terminals.
 * Updates last_seen in local DB and ingests into coordinator.
 */
export async function sendLocalHeartbeat(): Promise<void> {
  const deviceId = await getLocalDeviceId()
  const shopId = await AsyncStorage.getItem(SHOP_ID_KEY) ?? 'shop-default'

  await updateDeviceLastSeen(deviceId)

  const coord = await getCoordinator()
  const isPrimary = coord.isLocalPrimary()

  const hb: Heartbeat = {
    deviceId,
    shopId: asShopId(shopId) as never,
    timestamp: new Date().toISOString() as never,
    isPrimary,
    reachable: true,
    stockSequence: 0,
  }

  coord.ingestHeartbeat(hb)
}

/**
 * Initialize coordinator from existing device list in DB.
 * Call once on app startup.
 */
export async function initCoordinatorFromDb(): Promise<void> {
  const [deviceId, shopId] = await Promise.all([
    getLocalDeviceId(),
    AsyncStorage.getItem(SHOP_ID_KEY),
  ])

  const devices = await listDevices()
  const coord = await getCoordinator()

  for (const device of devices) {
    if (!device.lastSeen) continue
    const hb: Heartbeat = {
      deviceId: device.id,
      shopId: asShopId(shopId ?? 'shop-default') as never,
      timestamp: device.lastSeen as never,
      isPrimary: (device as never)['isPrimary'] ?? false,
      reachable: true,
      stockSequence: 0,
    }
    coord.ingestHeartbeat(hb)
  }
}

/**
 * Primary health badge label for UI display.
 */
export function primaryHealthLabel(state: PrimaryDeviceState): string {
  if (state.primaryId === null) return 'No Primary'
  switch (state.status) {
    case 'online': return 'Primary Online'
    case 'stale': return 'Primary Stale'
    case 'lost': return 'Primary Lost'
    default: return 'Unknown'
  }
}

/**
 * Primary health badge color for UI display.
 */
export function primaryHealthColor(state: PrimaryDeviceState): string {
  if (state.primaryId === null) return '#94A3B8'
  switch (state.status) {
    case 'online': return '#22c55e'
    case 'stale': return '#f59e0b'
    case 'lost': return '#ef4444'
    default: return '#94A3B8'
  }
}
