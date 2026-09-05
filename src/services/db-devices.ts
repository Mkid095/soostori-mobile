// Device CRUD — desktop-agent
import { getDb } from '../lib/db'
import type { Device, DeviceType } from '../lib/sync-protocol'
import { generateId } from '../lib/formatters'
import { enforcePermission, PERMISSIONS } from './sdk-bridge/rbac'
import { getCurrentRole } from './session-helper'

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

export async function getDeviceById(id: string): Promise<Device | null> {
  const db = await getDb()
  const row = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM devices WHERE id = ?', [id]
  )
  return row ? mapRow(row) : null
}

export async function getDeviceByShopAndType(
  shopId: string,
  deviceType: DeviceType,
): Promise<Device | null> {
  const db = await getDb()
  const row = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM devices WHERE shop_id = ? AND device_type = ?',
    [shopId, deviceType]
  )
  return row ? mapRow(row) : null
}

export async function registerDevice(
  shopId: string,
  deviceType: DeviceType,
  deviceName?: string,
  capabilities?: string[],
): Promise<Device> {
  const db = await getDb()
  const id = generateId()
  const now = new Date().toISOString()
  await db.runAsync(
    `INSERT INTO devices (id, shop_id, device_name, device_type, is_host, capabilities, last_seen, created_at)
     VALUES (?, ?, ?, ?, 0, ?, ?, ?)`,
    [id, shopId, deviceName ?? null, deviceType, capabilities ? JSON.stringify(capabilities) : null, now, now]
  )
  return { id, shopId, deviceName, deviceType, isHost: false, lastSeen: now, capabilities: capabilities ? JSON.stringify(capabilities) : undefined, createdAt: now }
}

export async function updateDeviceLastSeen(id: string): Promise<void> {
  const db = await getDb()
  const now = new Date().toISOString()
  await db.runAsync('UPDATE devices SET last_seen = ? WHERE id = ?', [now, id])
}

export async function setDeviceHost(id: string, isHost: boolean): Promise<void> {
  await enforcePermission(await getCurrentRole(), PERMISSIONS.HOST_SHOULDER)
  const db = await getDb()
  await db.runAsync('UPDATE devices SET is_host = ? WHERE id = ?', [isHost ? 1 : 0, id])
}

export async function assignDeviceToEmployee(deviceId: string, employeeId: string): Promise<void> {
  const db = await getDb()
  await db.runAsync('UPDATE devices SET employee_id = ? WHERE id = ?', [employeeId, deviceId])
}

export async function listDevices(shopId: string): Promise<Device[]> {
  const db = await getDb()
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM devices WHERE shop_id = ? ORDER BY created_at DESC',
    [shopId]
  )
  return rows.map(mapRow)
}
