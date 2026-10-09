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
import type { QueueStorage } from '@soostori/sync'

import {
  MobileQueueStorage,
  __setMobileQueueStorageDbForTesting,
} from './mobile-queue-storage'

/**
 * TODO: implement LAN sync client to connect to desktop host over local network.
 * The MobileOfflineSync queue drains to either a LAN client or a Cloud client.
 * Currently only the offline queue is implemented — no LAN client exists yet.
 * Phase 3 should add a LanSyncClient that discovers the desktop host via mDNS/Bonjour
 * and pushes sync events over a WebSocket or HTTP endpoint on the local network.
 */
export class MobileOfflineSync {
  readonly queue: OfflineQueue
  constructor(storage: MobileQueueStorage = new MobileQueueStorage()) {
    this.queue = new OfflineQueue(storage as unknown as QueueStorage)
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
