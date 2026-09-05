/**
 * MobileSyncIntegration — production-path wiring for Mobile sync.
 *
 * Phase 11.4 (Mobile Sync Migration). Connects the canonical OfflineQueue,
 * the canonical event mapper, and the LAN bridge that Mobile uses to
 * participate in the existing Phase 10 LAN protocol.
 *
 * Production-path:
 *   domain mutation
 *   → canonical SoostoriEvent
 *   → MobileOfflineSync.enqueue(event)
 *   → MobileQueueStorage (legacy sync_queue)
 *   → bridge.send(event)  (LAN when online; queued until drain when offline)
 *   → on receipt from LAN
 *   → primary authorization (canonical MobilePrimaryCoordinator)
 *   → apply to local SQLite (existing db-services)
 *
 * The actual LAN transport (WebSocket) lives in lan-client.ts. This
 * adapter wraps it for canonical-event semantics.
 */

import { createEvent } from '@soostori/events'
import { SALE_PENDING, SALE_CONFIRMED, SALE_REJECTED, STOCK_ADJUSTED, PRODUCT_UPDATED } from '@soostori/events'
import type { SoostoriEvent } from '@soostori/events'

import {
  MobileOfflineSync,
  __setMobileQueueStorageDbForTesting as __setQueueStub,
} from './mobile-offline-queue'
import type { OfflineQueueItem } from '@soostori/sync'

/* eslint-disable @typescript-eslint/no-explicit-any */

type Lane = 'lan' | 'queue'

/**
 * Lightweight bridge surface — test seam that captures the canonical-event
 * stream between enqueue() and the LAN transport. The Phase 10 LAN client
 * (lan-client.ts) replaces this seam in production.
 */
export interface MobileSyncBridge {
  /** Push a canonical event onto the LAN. Returns true if accepted. */
  sendToLan(event: SoostoriEvent): Promise<boolean>
  /** Receive a canonical event from the LAN. */
  onLanEvent(handler: (event: SoostoriEvent) => void): void
}

export interface MobileSyncIntegrationOptions {
  bridge: MobileSyncBridge
  sync: MobileOfflineSync
  /** Returns true if Primary is ONLINE (canonical authorization gate). */
  isPrimaryOnline: () => boolean
  /** Returns true if device currently has LAN connectivity. */
  isLanOnline: () => boolean
}

/**
 * Public entrypoint for the canonical Mobile sync surface.
 * Production wires this in lan-client.ts / sync-queue-helper.ts.
 */
export class MobileSyncIntegration {
  constructor(private readonly opts: MobileSyncIntegrationOptions) {}

  /**
   * Enqueue a domain mutation into the canonical OfflineQueue, then attempt
   * to push to LAN. If LAN offline → leave in queue for next drain.
   */
  async enqueue(event: SoostoriEvent): Promise<OfflineQueueItem> {
    const item = await this.opts.sync.enqueue(event)
    await this.tryPush(item)
    return item
  }

  /**
   * Drain pending items: push each to LAN. Items acknowledged as SENT get
   * marked sent in the queue. Failed items remain pending for retry.
   */
  async drain(): Promise<{ pushed: number; kept: number }> {
    const pending = await this.opts.sync.pending()
    let pushed = 0
    let kept = 0
    for (const item of pending) {
      const ok = await this.tryPush(item)
      if (ok) pushed++
      else kept++
    }
    return { pushed, kept }
  }

  /**
   * Push a queued item to LAN if reachable; mark SENT if acknowledged.
   * Gates by canonical Primary ONLINE check for sale events.
   */
  private async tryPush(item: OfflineQueueItem): Promise<boolean> {
    if (!this.opts.isLanOnline()) return false
    const event = item.event
    // Gate SALE_* events on Primary Device authorization.
    if (event.name.startsWith('sale.')) {
      if (!this.opts.isPrimaryOnline()) {
        await this.opts.sync.markFailed(item.id, 'PRIMARY_OFFLINE')
        return false
      }
    }
    try {
      const ok = await this.opts.bridge.sendToLan(event)
      if (ok) {
        await this.opts.sync.markSent(item.id)
        return true
      }
      await this.opts.sync.markFailed(item.id, 'LAN_REJECTED')
      return false
    } catch (err) {
      await this.opts.sync.markFailed(item.id, (err as Error).message ?? 'unknown')
      return false
    }
  }

  /** Mark an item sent (e.g., after LAN ack). Exposed for tests. */
  async ack(itemId: string): Promise<void> {
    await this.opts.sync.markSent(itemId)
  }
}

// Re-export the test seam so the integration test can stub the queue.
export { __setQueueStub }
