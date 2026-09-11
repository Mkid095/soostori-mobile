// sync-dead-letter.ts — Phase 16 dead-letter queue for sync outbox
// Events that exhaust all retries are moved here for manual review.

import { getDb } from '../lib/db'
import { MAX_RETRIES, getNextRetryDelay } from './sync-retry-backoff'

/**
 * handlePushFailure — called by pushOutbox when a cloud upload fails.
 * Increments retry count; if max retries exceeded, moves event to sync_dead_letter.
 * Otherwise schedules the next retry.
 */
export async function handlePushFailure(
  row: Record<string, unknown>,
  err: unknown,
): Promise<void> {
  const database = await getDb()
  const retryCount = Number(row.retry_count ?? 0) + 1
  const reason = err instanceof Error ? err.message : String(err)

  if (retryCount > MAX_RETRIES) {
    await database.runAsync(`DELETE FROM sync_outbox WHERE id = ?`, [row.id])
    await database.runAsync(
      `INSERT INTO sync_dead_letter
         (id, business_id, entity_kind, entity_id, operation, idempotency_key, payload, created_at, failed_at, reason)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        row.id, row.business_id, row.entity_kind, row.entity_id, row.operation,
        row.idempotency_key, row.payload, row.created_at,
        new Date().toISOString(), reason,
      ],
    )
    return
  }

  const delayMs = getNextRetryDelay(retryCount)
  const nextRetryAt = Date.now() + delayMs
  await database.runAsync(
    `UPDATE sync_outbox SET state = 'pending', retry_count = ?, next_retry_at = ? WHERE id = ?`,
    [retryCount, nextRetryAt, row.id],
  )
}

// ── Dead-letter accessors ────────────────────────────────────────────────────

export async function getDeadLetterCount(): Promise<number> {
  const database = await getDb()
  const row = await database.getFirstAsync<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM sync_dead_letter`,
  )
  return row?.cnt ?? 0
}

export async function retryDeadLetter(id: string): Promise<void> {
  const database = await getDb()
  const row = await database.getFirstAsync<Record<string, unknown>>(
    `SELECT * FROM sync_dead_letter WHERE id = ?`, [id],
  )
  if (!row) return
  await database.runAsync(
    `INSERT OR REPLACE INTO sync_outbox
       (id, business_id, entity_kind, entity_id, operation, idempotency_key, payload, created_at, state, retry_count, next_retry_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, NULL)`,
    [row.id, row.business_id, row.entity_kind, row.entity_id, row.operation,
     row.idempotency_key, row.payload, row.created_at],
  )
  await database.runAsync(`DELETE FROM sync_dead_letter WHERE id = ?`, [id])
}

export async function discardDeadLetter(id: string): Promise<void> {
  const database = await getDb()
  await database.runAsync(`DELETE FROM sync_dead_letter WHERE id = ?`, [id])
}

export async function getAllDeadLetters(): Promise<Array<{
  id: string; businessId: string; entityKind: string; entityId: string
  operation: string; reason: string | null; failedAt: string
}>> {
  const database = await getDb()
  const rows = await database.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM sync_dead_letter ORDER BY failed_at DESC`,
  )
  return rows.map(r => ({
    id: String(r.id),
    businessId: String(r.business_id),
    entityKind: String(r.entity_kind),
    entityId: String(r.entity_id),
    operation: String(r.operation),
    reason: r.reason ? String(r.reason) : null,
    failedAt: String(r.failed_at),
  }))
}

export async function getOutboxCounts(): Promise<{ pending: number; failed: number }> {
  const database = await getDb()
  const pending = await database.getFirstAsync<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM sync_outbox WHERE state IN ('pending', 'in_flight')`,
  )
  const failed = await database.getFirstAsync<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM sync_outbox WHERE retry_count > ?`,
    [MAX_RETRIES],
  )
  return { pending: pending?.cnt ?? 0, failed: failed?.cnt ?? 0 }
}
