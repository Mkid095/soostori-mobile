/**
 * expense-sync-event.ts — Phase 12
 * Canonical SyncEvent factory for expense mutations.
 * Imported by db-expenses.ts.
 *
 * Phase 12 invariants:
 *   1. IdempotencyKey = expense.id — replay of same event → no_op
 *   2. entityKind = 'expense'
 *   3. SyncOperation values: create | update | delete | tombstone
 */

import { generateId } from '../lib/formatters'
import { fromLocalExpense } from '../lib/contracts-mapper'
import { defaultSyncEngine } from '@soostori/contracts'
import type { SyncEvent } from '@soostori/contracts'
import type {
  BusinessId,
  DeviceId,
  EmployeeId,
  IdempotencyKey,
  SyncEventId,
} from '@soostori/core'

export async function enqueueExpenseSyncEvent(
  row: Record<string, unknown>,
  shopId: string,
  employeeId: string,
  deviceId: string,
  operation: 'create' | 'update' | 'delete' | 'tombstone',
): Promise<void> {
  const entity = fromLocalExpense(row)

  const event: SyncEvent = {
    id: generateId() as SyncEventId,
    // Phase 12 critical: idempotencyKey = expense.id
    // A replay with the same expense.id is a no_op — no duplicates.
    idempotencyKey: String(entity.id) as IdempotencyKey,
    businessId: shopId as BusinessId,
    entityKind: 'expense',
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
