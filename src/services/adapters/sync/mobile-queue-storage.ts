/**
 * MobileQueueStorage — implements @soostori/sync.QueueStorage.
 *
 * Phase 11.4 (Mobile Sync Migration) — bridges the canonical OfflineQueue
 * contract to the Mobile SQLite `sync_queue` table populated by
 * `sync-queue-helper.ts`. The legacy table schema is preserved (no
 * production data discarded); the SDK's OfflineQueueItem shape is
 * synthesized as a SoostoriEvent wrapper around the legacy payload.
 */

import type { OfflineQueueItem } from '@soostori/sync'
import { MobileQueueSqlite, newQueueItemId } from './mobile-queue-sqlite'

export type { OfflineQueueItem }

export interface LegacyRow {
  id: string
  shop_id: string
  table_name: string
  action: 'create' | 'update' | 'delete'
  payload: string
  status: 'pending' | 'in_flight' | 'sent' | 'failed' | string
  created_at: number | string
  retry_count: number
  retry_at: number | null
}

export { newQueueItemId }

export class MobileQueueStorage implements QueueStorage {
  private _sqlite = new MobileQueueSqlite()

  async getAll(): Promise<OfflineQueueItem[]> {
    return this._sqlite.getAll()
  }

  async save(item: OfflineQueueItem): Promise<void> {
    return this._sqlite.save(item)
  }

  async delete(id: string): Promise<void> {
    return this._sqlite.delete(id)
  }

  async pruneSent(): Promise<void> {
    return this._sqlite.pruneSent()
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function __setMobileQueueStorageDbForTesting(db: any): void {
  // Delegate to mobile-queue-sqlite test seam
  const { __setMobileQueueStorageDbForTesting: setDb } = require('./mobile-queue-sqlite')
  setDb(db)
}

interface QueueStorage {
  getAll(): Promise<OfflineQueueItem[]>
  save(item: OfflineQueueItem): Promise<void>
  delete(id: string): Promise<void>
  pruneSent(): Promise<void>
}
