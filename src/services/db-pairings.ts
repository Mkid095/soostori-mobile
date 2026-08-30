// Device pairing requests — desktop-agent
import { getDb } from '../lib/db'
import type { DevicePairing, PairingStatus } from '../lib/sync-protocol'
import { generateId } from '../lib/formatters'

function mapRow(row: Record<string, unknown>): DevicePairing {
  return {
    id: String(row.id),
    shopId: String(row.shop_id),
    deviceId: String(row.device_id),
    requestedBy: row.requested_by ? String(row.requested_by) : undefined,
    approvedBy: row.approved_by ? String(row.approved_by) : undefined,
    approvedAt: row.approved_at ? String(row.approved_at) : undefined,
    status: String(row.status) as PairingStatus,
    createdAt: String(row.created_at),
  }
}

export async function createPairing(
  shopId: string,
  deviceId: string,
  requestedBy?: string,
): Promise<DevicePairing> {
  const db = await getDb()
  const id = generateId()
  const now = new Date().toISOString()
  await db.runAsync(
    `INSERT INTO device_pairings (id, shop_id, device_id, requested_by, status, created_at)
     VALUES (?, ?, ?, ?, 'pending', ?)`,
    [id, shopId, deviceId, requestedBy ?? null, now]
  )
  return { id, shopId, deviceId, requestedBy, status: 'pending', createdAt: now }
}

export async function approvePairing(
  pairingId: string,
  approvedBy: string,
): Promise<void> {
  const db = await getDb()
  const now = new Date().toISOString()
  await db.runAsync(
    `UPDATE device_pairings SET status = 'approved', approved_by = ?, approved_at = ? WHERE id = ?`,
    [approvedBy, now, pairingId]
  )
}

export async function rejectPairing(pairingId: string): Promise<void> {
  const db = await getDb()
  await db.runAsync(
    `UPDATE device_pairings SET status = 'rejected' WHERE id = ?`,
    [pairingId]
  )
}

export async function getPendingPairings(shopId: string): Promise<DevicePairing[]> {
  const db = await getDb()
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM device_pairings WHERE shop_id = ? AND status = 'pending' ORDER BY created_at ASC`,
    [shopId]
  )
  return rows.map(mapRow)
}

export async function getPairingByDevice(deviceId: string): Promise<DevicePairing | null> {
  const db = await getDb()
  const row = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM device_pairings WHERE device_id = ? ORDER BY created_at DESC LIMIT 1',
    [deviceId]
  )
  return row ? mapRow(row) : null
}

export async function deletePairing(pairingId: string): Promise<void> {
  const db = await getDb()
  await db.runAsync('DELETE FROM device_pairings WHERE id = ?', [pairingId])
}
