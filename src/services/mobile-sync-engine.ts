/**
 * mobile-sync-engine.ts — Phase 16 Unified Sync Engine
 *
 * Responsibilities:
 *  - enqueue()   — write SyncEvent to local outbox, attempt immediate cloud upload
 *  - pushOutbox() — flush all pending outbox events with retry + dead-letter
 *  - pull()      — query cloud for new events
 *  - apply()     — translate cloud SyncEvent into local SQLite upsert
 *
 * Business isolation: every event is scoped to `activeBusinessId` (shopId).
 * Idempotency: INSERT OR REPLACE with idempotencyKey handles duplicates.
 */
import { db } from '../lib/instant-client'
import { getDb } from '../lib/db'
import { getCurrentShopId } from './session-helper'
import { MAX_RETRIES } from './sync-retry-backoff'
import { handlePushFailure, getOutboxCounts } from './sync-dead-letter'
import { uploadEventToCloud } from './sync-upload'
import { applySaleEvent, applyProductEvent, applyCustomerEvent, cloudEventToSyncEvent } from './sync-apply'
import type { SyncEvent } from '@soostori/contracts'
import type { SyncApplyResult } from '@soostori/contracts'
import type { DeviceId, EmployeeId } from '@soostori/core'

// ── Schema ─────────────────────────────────────────────────────────────────

const OUTBOX_TABLE = `
  CREATE TABLE IF NOT EXISTS sync_outbox (
    id              TEXT PRIMARY KEY,
    business_id     TEXT NOT NULL,
    entity_kind     TEXT NOT NULL,
    entity_id       TEXT NOT NULL,
    operation       TEXT NOT NULL,
    idempotency_key TEXT NOT NULL,
    payload         TEXT NOT NULL,
    created_at      TEXT NOT NULL,
    state           TEXT NOT NULL DEFAULT 'pending',
    retry_count     INTEGER NOT NULL DEFAULT 0,
    next_retry_at   INTEGER
  )
`

const DEAD_LETTER_TABLE = `
  CREATE TABLE IF NOT EXISTS sync_dead_letter (
    id              TEXT PRIMARY KEY,
    business_id     TEXT NOT NULL,
    entity_kind     TEXT NOT NULL,
    entity_id       TEXT NOT NULL,
    operation       TEXT NOT NULL,
    idempotency_key TEXT NOT NULL,
    payload         TEXT NOT NULL,
    created_at      TEXT NOT NULL,
    failed_at       TEXT NOT NULL,
    reason          TEXT
  )
`

const PROCESSED_TABLE = `
  CREATE TABLE IF NOT EXISTS sync_processed (
    idempotency_key TEXT PRIMARY KEY,
    business_id     TEXT NOT NULL,
    entity_kind     TEXT NOT NULL,
    entity_id       TEXT NOT NULL,
    operation       TEXT NOT NULL,
    applied_at      TEXT NOT NULL
  )
`

export async function ensureOutboxTable(): Promise<void> {
  const database = await getDb()
  await database.runAsync(OUTBOX_TABLE)
  await database.runAsync(DEAD_LETTER_TABLE)
  await database.runAsync(PROCESSED_TABLE)
}

// ── Enqueue ────────────────────────────────────────────────────────────────

/**
 * enqueue — write event to local outbox (survives crashes).
 * Always writes state='pending' so pushOutbox() can flush it.
 * Upload to cloud is attempted inline; if it fails the event stays
 * 'pending' and will be retried by pushOutbox().
 */
export async function enqueue(
  event: SyncEvent,
): Promise<{ state: 'queued' | 'acked' | 'rejected' }> {
  try {
    const database = await getDb()
    await database.runAsync(
      `INSERT OR REPLACE INTO sync_outbox
         (id, business_id, entity_kind, entity_id, operation, idempotency_key, payload, created_at, state, retry_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0)`,
      [
        event.id, event.businessId, event.entityKind, event.entityId,
        event.operation, event.idempotencyKey,
        JSON.stringify(event.payload), event.clientCreatedAt,
      ],
    )
    try {
      await uploadEventToCloud(event)
      await database.runAsync(
        `UPDATE sync_outbox SET state = 'acked' WHERE id = ?`,
        [event.id],
      )
      return { state: 'acked' }
    } catch {
      return { state: 'queued' }
    }
  } catch (err) {
    console.error('[MobileSyncEngine] enqueue failed:', err)
    return { state: 'rejected' }
  }
}

// ── Push ──────────────────────────────────────────────────────────────────

/**
 * pushOutbox — flush pending outbox events to cloud with retry + dead-letter.
 * Implements in_flight state to prevent duplicate pushes.
 * After MAX_RETRIES, moves event to sync_dead_letter.
 */
export async function pushOutbox(): Promise<{ pushed: number; failed: number }> {
  const database = await getDb()
  const now = Date.now()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[] = await database.getAllAsync(
    `SELECT * FROM sync_outbox
     WHERE state IN ('pending', 'in_flight')
       AND (next_retry_at IS NULL OR next_retry_at <= ?)
     ORDER BY created_at ASC`,
    [now],
  )

  let pushed = 0, failed = 0
  for (const row of rows) {
    // Mark in_flight immediately so concurrent pushes can't duplicate
    await database.runAsync(
      `UPDATE sync_outbox SET state = 'in_flight' WHERE id = ? AND state = 'pending'`,
      [row.id],
    )
    const current = await database.getFirstAsync<{ state: string }>(
      `SELECT state FROM sync_outbox WHERE id = ?`, [row.id],
    )
    if (current?.state !== 'in_flight') continue

    try {
      const event: SyncEvent = {
        id: row.id,
        idempotencyKey: row.idempotency_key,
        businessId: row.business_id,
        entityKind: row.entity_kind as SyncEvent['entityKind'],
        entityId: row.entity_id,
        operation: row.operation as SyncEvent['operation'],
        originatingDeviceId: 'mobile' as DeviceId,
        originatingEmployeeId: 'system' as EmployeeId,
        clientSequence: Date.now(),
        clientCreatedAt: row.created_at,
        entityVersion: 1,
        payload: JSON.parse(row.payload),
        state: 'pending',
      }
      await uploadEventToCloud(event)
      await database.runAsync(
        `UPDATE sync_outbox SET state = 'acked' WHERE id = ?`,
        [row.id],
      )
      pushed++
    } catch (err) {
      await handlePushFailure(row, err)
      failed++
    }
  }
  return { pushed, failed }
}

// ── Pull ──────────────────────────────────────────────────────────────────

export interface PullResult {
  events: SyncEvent[]
  cursor: string
}

/**
 * pull — query cloud for events newer than lastSyncAt.
 * InstantDB doesn't support GT on strings, so we filter in-memory.
 */
export async function pull(lastSyncAt: string | null): Promise<PullResult> {
  const shopId = await getCurrentShopId()
  if (!shopId) return { events: [], cursor: lastSyncAt ?? new Date().toISOString() }

  const result = await db.queryOnce({
    syncEvents: { $: { where: { shopId } } },
  })

  const rawEvents =
    (result.data.syncEvents as Array<Record<string, unknown>>) ?? []
  const since = lastSyncAt ?? ''

  const seen = new Set<string>()
  const filtered = rawEvents.filter(cev => {
    const ts = String(cev.syncedAt ?? cev.timestamp ?? '')
    if (ts <= since) return false
    const key = String(cev.idempotencyKey ?? cev.id ?? '')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  filtered.sort((a, b) =>
    String(a.syncedAt ?? a.timestamp ?? '').localeCompare(
      String(b.syncedAt ?? b.timestamp ?? ''),
    ),
  )

  const events = filtered.map(cev => cloudEventToSyncEvent(cev, shopId))
  const cursor =
    filtered.length > 0
      ? String(filtered[filtered.length - 1].syncedAt
          ?? filtered[filtered.length - 1].timestamp
          ?? new Date().toISOString())
      : (lastSyncAt ?? new Date().toISOString())

  return { events, cursor }
}

// ── Apply ─────────────────────────────────────────────────────────────────

/** Phase 17: derive notification event type from SyncEvent entityKind + operation. */
function syncEventType(event: SyncEvent): string {
  const { entityKind } = event
  // operation is 'create' | 'update' | 'delete' | 'tombstone'.
  // Some Phase 17 events carry their sub-type in the payload.
  const p = event.payload as Record<string, unknown>
  const payloadOp = p?.operation as string | undefined

  switch (entityKind) {
    case 'sale': {
      if (payloadOp === 'refund') return 'sale.refunded'
      return `sale.${event.operation}`
    }
    case 'debt':       return event.operation === 'create' ? 'debt.created' : `debt.${event.operation}`
    case 'debtPayment': return 'debt.payment_recorded'
    case 'expense':    return `expense.${event.operation}`
    case 'product': {
      if (payloadOp === 'low_stock' || payloadOp === 'adjust' || event.operation === 'update') return 'inventory.low_stock'
      return `inventory.${event.operation}`
    }
    case 'stockMovement': return payloadOp === 'receive' ? 'inventory.received' : 'inventory.adjusted'
    case 'employee':    return event.operation === 'create' ? 'team.member_added' : `team.${event.operation}`
    case 'device':      return `device.${event.operation}`
    case 'commissionLedger': return event.operation === 'create' ? 'commission.created' : `commission.${event.operation}`
    default:            return `${entityKind}.${event.operation}`
  }
}

/** Phase 17: map SyncEvent → NotificationEvent fields for dispatch. */
async function dispatchNotification(event: SyncEvent): Promise<void> {
  // Lazy import to avoid circular dependency
  const { createNotification } = await import('./db-notifications')
  const { sendExpoNotification } = await import('./notifications/expo-push-channel')

  const et = syncEventType(event)
  const HIGH_PRIORITY = new Set(['inventory.low_stock', 'debt.payment_recorded', 'debt.settled', 'device.revoked'])
  const priority = HIGH_PRIORITY.has(et) ? 'high' : 'normal'

  const TITLES: Record<string, string> = {
    'sale.created': 'New Sale',
    'sale.refunded': 'Sale Refunded',
    'debt.created': 'New Debt',
    'debt.payment_recorded': 'Payment Received',
    'debt.settled': 'Debt Settled',
    'expense.created': 'New Expense',
    'expense.approved': 'Expense Approved',
    'inventory.low_stock': 'Low Stock Alert',
    'inventory.received': 'Stock Received',
    'inventory.adjusted': 'Stock Adjusted',
    'team.member_added': 'Team Update',
    'device.enrolled': 'Device Enrolled',
    'device.approved': 'Device Approved',
    'device.revoked': 'Device Revoked',
    'commission.created': 'Commission Earned',
  }

  const title = TITLES[et] ?? 'Notification'
  const body = eventPayloadSummary(event, et)

  // 1. Persist to local SQLite notifications table
  try {
    await createNotification({
      title,
      body,
      data: { eventType: et, payload: event.payload },
      eventType: et as Parameters<typeof createNotification>[0]['eventType'],
      businessId: event.businessId,
      priority: priority as Parameters<typeof createNotification>[0]['priority'],
    })
  } catch (err) {
    console.warn('[SyncEngine] Failed to persist notification:', err)
  }

  // 2. Fire Expo local notification (immediate)
  try {
    await sendExpoNotification({ title, body, eventType: et, payload: event.payload, priority })
  } catch (err) {
    console.warn('[SyncEngine] Failed to send Expo notification:', err)
  }
}

function eventPayloadSummary(event: SyncEvent, et: string): string {
  const p = event.payload as Record<string, unknown>
  switch (et) {
    case 'sale.created':
      return `Sale of ${p.totalAmount ?? '—'} recorded`
    case 'debt.payment_recorded':
      return `Payment of ${p.amountPaid ?? '—'} recorded`
    case 'debt.settled':
      return `Debt of ${p.amount ?? '—'} fully paid`
    case 'debt.created':
      return `New debt of ${p.amount ?? '—'} created`
    case 'inventory.low_stock':
      return `${p.productName ?? 'Product'} is low on stock`
    case 'inventory.received':
      return `Stock received: ${p.productName ?? 'product'}`
    case 'expense.created':
      return `Expense of ${p.amount ?? '—'} logged`
    case 'expense.approved':
      return `Expense of ${p.amount ?? '—'} approved`
    case 'commission.created':
      return `Commission of ${p.amount ?? '—'} earned`
    case 'team.member_added':
      return `${p.memberName ?? 'New member'} joined the team`
    case 'device.enrolled':
      return `New device enrolled`
    case 'device.revoked':
      return `Device access has been revoked`
    default:
      return et
  }
}

export async function apply(
  _local: unknown,
  event: SyncEvent,
  shopId: string,
): Promise<SyncApplyResult> {
  if (event.businessId !== shopId) return { state: 'no_op' }
  const database = await getDb()

  if (event.entityKind === 'product') return applyProductEvent(database, event)
  if (event.entityKind === 'sale')    return applySaleEvent(database, event)
  if (event.entityKind === 'customer') return applyCustomerEvent(database, event)

  return { state: 'no_op' }
}

/**
 * applyAndNotify — Phase 17 wrapper around apply() that fires notifications
 * for high/urgent events after successful apply.
 * Call this from pullAndApply() instead of apply() directly.
 */
export async function applyAndNotify(
  _local: unknown,
  event: SyncEvent,
  shopId: string,
): Promise<SyncApplyResult> {
  const result = await apply(_local, event, shopId)
  if (result.state === 'applied') {
    const et = syncEventType(event)
    const HIGH_URGENT = new Set([
      'inventory.low_stock', 'debt.payment_recorded', 'debt.settled',
      'device.revoked', 'commission.created', 'sale.created',
    ])
    if (HIGH_URGENT.has(et)) {
      // Fire-and-forget — errors are caught inside dispatchNotification
      dispatchNotification(event).catch(console.warn)
    }
  }
  return result
}
