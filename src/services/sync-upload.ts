// sync-upload.ts — Phase 16: upload SyncEvent to FIDScript cloud
// Extracted from mobile-sync-engine.ts.

import { db, id } from '../lib/instant-client'
import type { SyncEvent } from '@soostori/contracts'

export async function uploadEventToCloud(event: SyncEvent): Promise<void> {
  const now = new Date().toISOString()
  await db.transact([
    db.tx.syncEvents[id()].create({
      id: event.id,
      shopId: event.businessId,
      entityId: event.entityId,
      entity: event.entityKind,
      operation: event.operation,
      payload: event.payload,
      syncedAt: now,
      version: event.entityVersion,
      idempotencyKey: event.idempotencyKey,
      timestamp: event.clientCreatedAt,
      sequenceNumber: event.clientSequence,
      deviceId: event.originatingDeviceId,
    }),
  ])
}
