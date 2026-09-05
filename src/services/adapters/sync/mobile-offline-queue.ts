/**
 * MobileOfflineSync — composes @soostori/sync.OfflineQueue over
 * MobileQueueStorage. Production-path adapter that the LAN client and
 * Cloud client push through.
 *
 * Phase 11.4 (Mobile Sync Migration).
 */

import { OfflineQueue } from '@soostori/sync'
import type { OfflineQueueItem } from '@soostori/sync'
import type { SoostoriEvent } from '@soostori/events'

import {
  MobileQueueStorage,
  __setMobileQueueStorageDbForTesting,
} from './mobile-queue-storage'

export class MobileOfflineSync {
  readonly queue: OfflineQueue
  constructor(storage: MobileQueueStorage = new MobileQueueStorage()) {
    this.queue = new OfflineQueue(storage)
  }

  /** Add a domain event to the offline queue. */
  async enqueue(event: SoostoriEvent): Promise<OfflineQueueItem> {
    return this.queue.add(event)
  }

  /** Inspect pending items without consuming. */
  async pending(): Promise<OfflineQueueItem[]> {
    return this.queue.getPending()
  }

  /** Mark an item as sent (after LAN/Cloud acknowledgement). */
  async markSent(id: string): Promise<void> {
    await this.queue.markSent(id)
  }

  /** Mark an item as failed (will retry with backoff next tick). */
  async markFailed(id: string, error: string): Promise<void> {
    await this.queue.markFailed(id, error)
  }

  /** Drain all pending items after a successful drain (post-reconnect). */
  async purge(): Promise<void> {
    await this.queue.purge()
  }
}

// Test seam — re-exported for convenience.
export { __setMobileQueueStorageDbForTesting }
