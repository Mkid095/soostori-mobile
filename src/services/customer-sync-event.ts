/**
 * customer-sync-event.ts — Phase 10
 * Canonical SyncEvent factory for customer mutations.
 * Imported by db-customers.ts.
 *
 * Critical invariants (Phase 10):
 *   1. No duplicate customers from replay — idempotencyKey = customer.id
 *      The customer.id is generated locally before INSERT; a cloud replay of
 *      the same create event carries the same customer.id → INSERT OR IGNORE
 *      or the local row already exists → apply() returns no_op.
 *   2. Customer sync does NOT gate sale sync — customer is reference data.
 *      A sale may reference a customer by id; sale validity is independent
 *      of whether the customer has been synced.
 */

import { generateId } from '../lib/formatters'
import { fromLocalCustomer } from '../lib/contracts-mapper'
import { defaultSyncEngine } from '@soostori/contracts'
import type { SyncEvent } from '@soostori/contracts'
import type {
  BusinessId,
  DeviceId,
  EmployeeId,
  IdempotencyKey,
  SyncEventId,
} from '@soostori/core'

export async function enqueueCustomerSyncEvent(
  row: Record<string, unknown>,
  shopId: string,
  employeeId: string,
  deviceId: string,
  operation: 'create' | 'update' | 'delete' | 'tombstone',
): Promise<void> {
  const entity = fromLocalCustomer(row)

  const event: SyncEvent = {
    id: generateId() as SyncEventId,
    // Phase 10 critical: idempotencyKey = customer.id
    // A replay with the same customer.id is a no_op — no duplicates.
    idempotencyKey: String(entity.id) as IdempotencyKey,
    businessId: shopId as BusinessId,
    entityKind: 'customer',
    entityId: String(entity.id),
    operation,
    originatingDeviceId: deviceId as DeviceId,
    originatingEmployeeId: employeeId as EmployeeId,
    clientSequence: Date.now(),
    clientCreatedAt: entity.updatedAt,
    entityVersion: entity.version,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload: entity as any,
    state: 'pending',
  }

  await defaultSyncEngine.enqueue(event)
}
