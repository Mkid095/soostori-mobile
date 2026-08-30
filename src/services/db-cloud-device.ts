// Device registration with cloud

import AsyncStorage from '@react-native-async-storage/async-storage'
import { getDb } from '../lib/db'
import { updateSyncState } from './db-sync-state'

const DEVICE_ID_KEY = '@soostori:deviceId'

export async function registerDeviceWithCloud(cloudDeviceId: string): Promise<void> {
  const db = await getDb()
  const deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY)
  if (deviceId) {
    await db.runAsync(
      `UPDATE devices SET cloud_device_id = ?, cloud_registered = 1, cloud_registered_at = ? WHERE id = ?`,
      [cloudDeviceId, new Date().toISOString(), deviceId]
    )
  }
  await updateSyncState({ cloudDeviceId })
}

export async function isDeviceCloudRegistered(): Promise<boolean> {
  const db = await getDb()
  const deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY)
  if (!deviceId) return false
  const row = await db.getFirstAsync<Record<string, unknown>>(
    `SELECT cloud_registered FROM devices WHERE id = ?`, [deviceId]
  )
  return row ? Boolean(row.cloud_registered) : false
}
