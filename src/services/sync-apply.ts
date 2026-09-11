// sync-apply.ts — Phase 16: re-exports + cloud event mapping
// sync-upload.ts has uploadEventToCloud
// sync-apply-sale.ts has applySaleEvent
// sync-apply-product.ts has applyProductEvent
// sync-apply-customer.ts has applyCustomerEvent

import type { SyncEvent } from '@soostori/contracts'

export { applySaleEvent } from './sync-apply-sale'
export { applyProductEvent } from './sync-apply-product'
export { applyCustomerEvent } from './sync-apply-customer'

export function cloudEventToSyncEvent(
  cev: Record<string, unknown>,
  shopId: string,
): SyncEvent {
  const payload = cev.payload as Record<string, unknown> | undefined
  return {
    id: String(cev.id ?? ''),
    idempotencyKey: String(cev.idempotencyKey ?? cev.id ?? ''),
    businessId: String(cev.shopId ?? shopId),
    entityKind: String(cev.entity ?? '') as SyncEvent['entityKind'],
    entityId: String(cev.entityId ?? ''),
    operation: String(cev.operation ?? '') as SyncEvent['operation'],
    originatingDeviceId: String(cev.deviceId ?? 'cloud'),
    originatingEmployeeId: 'cloud',
    clientSequence: Number(cev.sequenceNumber ?? 0),
    clientCreatedAt: String(cev.timestamp ?? cev.syncedAt ?? new Date().toISOString()),
    entityVersion: Number(cev.version ?? 1),
    payload: payload ?? {},
    state: 'pending',
  }
}
