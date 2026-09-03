// Sync cursor — Phase 10
// Persists the last-applied cloud sync position in AsyncStorage.

import { getDb } from '../lib/db'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { db } from '../lib/instant-client'
import { cloudDownloadEvents } from './cloud-sync-api'
import type { SyncEvent } from '../contracts/cloud'

const CURSOR_KEY = '@soostori:cloudSyncCursor'

export async function getSyncCursor(): Promise<string> {
  return (await AsyncStorage.getItem(CURSOR_KEY)) || '0'
}

export async function setSyncCursor(cursor: string): Promise<void> {
  await AsyncStorage.setItem(CURSOR_KEY, cursor)
}

export async function pullCloudChanges(): Promise<Array<{
  id: string
  entity: string
  operation: string
  payload: unknown
}>> {
  const events = await cloudDownloadEvents()
  const cursor = await getSyncCursor()
  const sorted = [...events].sort((a: SyncEvent, b: SyncEvent) =>
    String(a.syncedAt || '').localeCompare(String(b.syncedAt || ''))
  )
  return sorted.map((e: SyncEvent) => ({
    id: e.id,
    entity: e.entity,
    operation: e.operation,
    payload: e.payload as unknown,
  }))
}
