// db-devices-phase15.ts — Phase 15 canonical device service
// Extracted from db-devices.ts to satisfy 150-line/file limit
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getDb } from '../lib/db'
import type { Device, DeviceType } from '../lib/sync-protocol'
import { generateId } from '../lib/formatters'
import { enforcePermission, PERMISSIONS } from './sdk-bridge/rbac'
import { getCurrentRole } from './session-helper'
import { queueSync } from './sync-queue-helper'
import { logAudit } from './db-audit'
import { enqueueDeviceSyncEvent } from './device-sync-event'

const SHOP_ID_KEY = '@soostori:shopId'

export type DeviceStatus = 'pending' | 'authorized' | 'revoked'

export interface DeviceRow extends Device {
  status: DeviceStatus
  isPrimary: boolean
}

function mapRow(row: Record<string, unknown>): Device {
  return {
    id: String(row.id),
    shopId: String(row.shop_id),
    employeeId: row.employee_id ? String(row.employee_id) : undefined,
    deviceName: row.device_name ? String(row.device_name) : undefined,
    deviceType: (String(row.device_type) || 'mobile') as DeviceType,
    isHost: Boolean(row.is_host),
    lastSeen: row.last_seen ? String(row.last_seen) : undefined,
    capabilities: row.capabilities ? String(row.capabilities) : undefined,
    createdAt: String(row.created_at),
  }
}

function mapRowExtended(row: Record<string, unknown>): DeviceRow {
  return {
    ...mapRow(row),
    status: (String(row.status) || 'pending') as DeviceStatus,
    isPrimary: Boolean(row.is_primary),
  }
}

async function currentShopId(): Promise<string> {
  const id = await AsyncStorage.getItem(SHOP_ID_KEY)
  return id ?? 'shop-default'
}

// ── Enroll ────────────────────────────────────────────────────────────────────

export async function enrollDevice(
  name: string,
  type: DeviceType = 'mobile',
): Promise<Device> {
  const role = await getCurrentRole()
  enforcePermission(role, PERMISSIONS.DEVICE_APPROVE)

  const shopId = await currentShopId()
  const db = await getDb()
  const id = generateId()
  const now = new Date().toISOString()

  await db.runAsync(
    `INSERT INTO devices (id, shop_id, device_name, device_type, status, is_primary, last_seen, created_at)
     VALUES (?, ?, ?, ?, 'pending', 0, ?, ?)`,
    [id, shopId, name, type, now, now]
  )

  await logAudit(shopId, 'device.enrolled', 'device', id, undefined, id)
  await enqueueDeviceSyncEvent(shopId, id, 'device.enrolled', { deviceName: name, deviceType: type })
  await queueSync('devices', 'create', id, shopId)

  return { id, shopId, deviceName: name, deviceType: type, isHost: false, lastSeen: now, createdAt: now }
}

// ── List ──────────────────────────────────────────────────────────────────────

export async function listDevices(): Promise<DeviceRow[]> {
  const role = await getCurrentRole()
  enforcePermission(role, PERMISSIONS.DEVICE_APPROVE)

  const shopId = await currentShopId()
  const db = await getDb()
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM devices WHERE shop_id = ? ORDER BY created_at DESC',
    [shopId]
  )
  return rows.map(mapRowExtended)
}

// ── Approve ─────────────────────────────────────────────────────────────────

export async function approveDevice(id: string): Promise<void> {
  const role = await getCurrentRole()
  enforcePermission(role, PERMISSIONS.DEVICE_APPROVE)

  const shopId = await currentShopId()
  const db = await getDb()
  await db.runAsync(
    `UPDATE devices SET status = 'authorized' WHERE id = ? AND shop_id = ?`,
    [id, shopId]
  )

  await logAudit(shopId, 'device.approved', 'device', id, undefined, id)
  await enqueueDeviceSyncEvent(shopId, id, 'device.approved')
  await queueSync('devices', 'update', id, shopId)
}

// ── Revoke ──────────────────────────────────────────────────────────────────

export async function revokeDevice(id: string): Promise<void> {
  const role = await getCurrentRole()
  enforcePermission(role, PERMISSIONS.DEVICE_APPROVE)

  const shopId = await currentShopId()
  const db = await getDb()
  await db.runAsync(
    `UPDATE devices SET status = 'revoked', is_primary = 0 WHERE id = ? AND shop_id = ?`,
    [id, shopId]
  )

  await logAudit(shopId, 'device.revoked', 'device', id, undefined, id)
  await enqueueDeviceSyncEvent(shopId, id, 'device.revoked')
  await queueSync('devices', 'update', id, shopId)
}

// ── Primary ─────────────────────────────────────────────────────────────────

export async function transferPrimary(toDeviceId: string): Promise<void> {
  const role = await getCurrentRole()
  enforcePermission(role, PERMISSIONS.DEVICE_APPROVE)

  const shopId = await currentShopId()
  const db = await getDb()

  await db.runAsync(
    `UPDATE devices SET is_primary = 0 WHERE shop_id = ? AND is_primary = 1`,
    [shopId]
  )
  await db.runAsync(
    `UPDATE devices SET is_primary = 1, status = 'authorized' WHERE id = ? AND shop_id = ?`,
    [toDeviceId, shopId]
  )

  await logAudit(shopId, 'device.primary_transferred', 'device', toDeviceId, undefined, toDeviceId)
  await enqueueDeviceSyncEvent(shopId, toDeviceId, 'device.primary_transferred', { toDeviceId })
  await queueSync('devices', 'update', toDeviceId, shopId)
}

export async function getPrimaryStatus(): Promise<DeviceRow | null> {
  const role = await getCurrentRole()
  enforcePermission(role, PERMISSIONS.DEVICE_APPROVE)

  const shopId = await currentShopId()
  const db = await getDb()
  const row = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM devices WHERE shop_id = ? AND is_primary = 1 LIMIT 1',
    [shopId]
  )
  return row ? mapRowExtended(row) : null
}
