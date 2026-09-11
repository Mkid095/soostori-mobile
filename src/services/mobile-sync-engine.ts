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
        originatingDeviceId: 'mobile',
        originatingEmployeeId: 'system',
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
