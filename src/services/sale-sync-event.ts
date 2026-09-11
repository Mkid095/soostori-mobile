/**
 * sale-sync-event.ts — Phase 09
 * Canonical SyncEvent factory for sale creation.
 * Imported by db-sale-create.ts and db-sale-offline.ts.
 */

import { generateId } from '../../lib/formatters'
import { fromLocalSale } from '../../lib/contracts-mapper'
import { defaultSyncEngine } from '@soostori/contracts'
import type { SyncEvent } from '@soostori/contracts'
import type { BusinessId, DeviceId, EmployeeId, IdempotencyKey, SyncEventId } from '@soostori/core'

export async function enqueueSaleSyncEvent(
  row: Record<string, unknown>,
  shopId: string,
  employeeId: string,
  deviceId: string,
): Promise<void> {
  const entity = fromLocalSale(row)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(entity as any).items?.forEach((item: Record<string, unknown>) => {
    if (!item.idempotencyKey) item.idempotencyKey = `${row.id}:${item.productId}`
  })

  const event: SyncEvent = {
    id: generateId() as SyncEventId,
    idempotencyKey: String(row.id) as IdempotencyKey,
    businessId: shopId as BusinessId,
    entityKind: 'sale',
    entityId: String(entity.id),
    operation: 'create',
    originatingDeviceId: deviceId as DeviceId,
    originatingEmployeeId: employeeId as EmployeeId,
    clientSequence: Date.now(),
    clientCreatedAt: entity.createdAt,
    entityVersion: entity.version,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload: entity as any,
    state: 'pending',
  }

  await defaultSyncEngine.enqueue(event)
}
