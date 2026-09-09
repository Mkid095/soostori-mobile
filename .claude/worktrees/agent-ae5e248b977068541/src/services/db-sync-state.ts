// Sync state read/write — tracks cloud sync cursor and entitlement status

import { getDb } from '../lib/db'

export interface SyncState {
  id: string
  shopId: string
  deviceId?: string
  cloudDeviceId?: string
  lastCloudSyncAt?: string
  lastSequenceNumber: number
  pendingUploadCount: number
  cloudEntitlementStatus?: string
  entitlementVerifiedAt?: string
  entitlementExpiresAt?: string
}

export async function getSyncState(): Promise<SyncState> {
  const db = await getDb()
  const row = await db.getFirstAsync<Record<string, unknown>>(
    `SELECT * FROM sync_state WHERE id = 'default'`
  )
  if (!row) {
    return {
      id: 'default',
      shopId: 'default',
      lastSequenceNumber: 0,
      pendingUploadCount: 0,
    }
  }
  return {
    id: String(row.id),
    shopId: String(row.shop_id),
    deviceId: row.device_id ? String(row.device_id) : undefined,
    cloudDeviceId: row.cloud_device_id ? String(row.cloud_device_id) : undefined,
    lastCloudSyncAt: row.last_cloud_sync_at ? String(row.last_cloud_sync_at) : undefined,
    lastSequenceNumber: Number(row.last_sequence_number ?? 0),
    pendingUploadCount: Number(row.pending_upload_count ?? 0),
    cloudEntitlementStatus: row.cloud_entitlement_status ? String(row.cloud_entitlement_status) : undefined,
    entitlementVerifiedAt: row.entitlement_verified_at ? String(row.entitlement_verified_at) : undefined,
    entitlementExpiresAt: row.entitlement_expires_at ? String(row.entitlement_expires_at) : undefined,
  }
}

export async function updateSyncState(updates: Partial<SyncState>): Promise<void> {
  const db = await getDb()
  const sets: string[] = ['updated_at = ?']
  const values: (string | number | null)[] = [new Date().toISOString()]

  if (updates.lastSequenceNumber !== undefined) {
    sets.push('last_sequence_number = ?')
    values.push(updates.lastSequenceNumber)
  }
  if (updates.pendingUploadCount !== undefined) {
    sets.push('pending_upload_count = ?')
    values.push(updates.pendingUploadCount)
  }
  if (updates.cloudEntitlementStatus !== undefined) {
    sets.push('cloud_entitlement_status = ?')
    values.push(updates.cloudEntitlementStatus)
  }
  if (updates.entitlementVerifiedAt !== undefined) {
    sets.push('entitlement_verified_at = ?')
    values.push(updates.entitlementVerifiedAt)
  }
  if (updates.entitlementExpiresAt !== undefined) {
    sets.push('entitlement_expires_at = ?')
    values.push(updates.entitlementExpiresAt)
  }
  if (updates.cloudDeviceId !== undefined) {
    sets.push('cloud_device_id = ?')
    values.push(updates.cloudDeviceId)
  }
  if (updates.lastCloudSyncAt !== undefined) {
    sets.push('last_cloud_sync_at = ?')
    values.push(updates.lastCloudSyncAt)
  }

  await db.runAsync(`UPDATE sync_state SET ${sets.join(', ')} WHERE id = 'default'`, values)
}
