// Device recovery — restores shop state from cloud snapshot
// Phase 4 — Device Recovery
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getDb } from '../lib/db'

export async function exportLocalSnapshot(): Promise<Record<string, unknown>> {
  // Export all essential local data for recovery
  // Products, employees, customers, settings, etc.
  // Returns a JSON-serializable snapshot
  throw new Error('Cloud API not yet defined — pending sync-contract.md')
}

export async function importCloudSnapshot(snapshot: Record<string, unknown>): Promise<void> {
  // Clear local data and restore from cloud snapshot
  // Must be called after cloud authentication
  throw new Error('Cloud API not yet defined — pending sync-contract.md')
}

export async function isNewDevice(): Promise<boolean> {
  const cloudRegistered = await AsyncStorage.getItem('@soostori:cloudDeviceId')
  return !cloudRegistered
}

export async function clearDeviceIdentity(): Promise<void> {
  await AsyncStorage.multiRemove([
    '@soostori:deviceId',
    '@soostori:cloudDeviceId',
    '@soostori:cloudToken',
    '@soostori:employeeId',
    '@soostori:employeeRole',
  ])
}
