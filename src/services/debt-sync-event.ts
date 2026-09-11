/**
 * debt-sync-event.ts — Phase 11
 * Canonical SyncEvent factory for debt + payment mutations.
 * Imported by db-debts.ts.
 *
 * Phase 11 invariants:
 *   1. IdempotencyKey = debt.id — replay of same event → no_op
 *   2. Payment events use debt_payment.id as idempotencyKey — no duplicate payment
 *   3. entityKind='debt' for ALL debt-related events (brief requirement)
 */

import { generateId } from '../lib/formatters'
import { fromLocalDebt, fromLocalDebtPayment } from '../lib/contracts-mapper'
import { defaultSyncEngine } from '@soostori/contracts'
import type { SyncEvent } from '@soostori/contracts'
import type {
  BusinessId,
  DeviceId,
  EmployeeId,
  IdempotencyKey,
  SyncEventId,
} from '@soostori/core'

export async function enqueueDebtSyncEvent(
  row: Record<string, unknown>,
  shopId: string,
  employeeId: string,
  deviceId: string,
  operation: 'create' | 'update' | 'delete' | 'tombstone',
): Promise<void> {
  const entity = fromLocalDebt(row)

  const event: SyncEvent = {
    id: generateId() as SyncEventId,
    // Phase 11 critical: idempotencyKey = debt.id
    // A replay with the same debt.id is a no_op — no duplicates.
    idempotencyKey: String(entity.id) as IdempotencyKey,
    businessId: shopId as BusinessId,
    entityKind: 'debt',
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

export async function enqueueDebtPaymentSyncEvent(
  paymentRow: Record<string, unknown>,
  shopId: string,
  employeeId: string,
  deviceId: string,
): Promise<void> {
  const entity = fromLocalDebtPayment(paymentRow)

  // Brief §Sync event emission: 'debt.payment' — entityKind='debt' per brief
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(entity as any).entityKind = 'debt'

  const event: SyncEvent = {
    id: generateId() as SyncEventId,
    // IdempotencyKey = payment.id — replays are no-ops
    idempotencyKey: String(entity.id) as IdempotencyKey,
    businessId: shopId as BusinessId,
    entityKind: 'debt',
    entityId: String(entity.debtId),
    // Valid SyncOperation values only: create | update | delete | tombstone
    // 'payment' is the event name; the payment record itself is created here
    operation: 'create',
    originatingDeviceId: deviceId as DeviceId,
    originatingEmployeeId: employeeId as EmployeeId,
    clientSequence: Date.now(),
    clientCreatedAt: entity.timestamp,
    entityVersion: entity.version,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload: entity as any,
    state: 'pending',
  }

  await defaultSyncEngine.enqueue(event)
}
