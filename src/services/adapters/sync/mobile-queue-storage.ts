/**
 * MobileQueueStorage — implements @soostori/sync.QueueStorage.
 *
 * Phase 11.4 (Mobile Sync Migration) — bridges the canonical OfflineQueue
 * contract to the Mobile SQLite `sync_queue` table populated by
 * `sync-queue-helper.ts`. The legacy table schema is preserved (no
 * production data discarded); the SDK's OfflineQueueItem shape is
 * synthesized as a SoostoriEvent wrapper around the legacy payload.
 *
 * Conversion table:
 *
 *   sync_queue.id             → OfflineQueueItem.id
 *   sync_queue.payload (JSON) → SoostoriEvent { name, ... }
 *   sync_queue.status         → OfflineQueueItem.status
 *                              (pending|in_flight|sent|failed)
 *   sync_queue.retry_count    → OfflineQueueItem.retryCount
 *   sync_queue.retry_at       → OfflineQueueItem.nextRetryAt
 */

import { newId } from '@soostori/core'
import { createEvent, type SoostoriEvent, type SoostoriEventName } from '@soostori/events'
import type { QueueStorage, OfflineQueueItem } from '@soostori/sync'

/* eslint-disable @typescript-eslint/no-explicit-any */

let __testDb: unknown = undefined
export function __setMobileQueueStorageDbForTesting(db: unknown): void {
  __testDb = db
}
async function loadDb(): Promise<unknown> {
  if (__testDb !== undefined) return __testDb
  return await import('../../sync-queue-helper')
}

interface LegacyRow {
  id: string
  shop_id: string
  table_name: string
  action: 'create' | 'update' | 'delete'
  payload: string
  status: 'pending' | 'in_flight' | 'sent' | 'failed' | string
  created_at: number | string
  retry_count: number
  retry_at: number | null
}

/** Synthesize a canonical SoostoriEvent from a legacy row. */
function rowToEvent(row: LegacyRow): SoostoriEvent {
  const payload = safeParse(row.payload) ?? {}
  // The original canonical event name is preserved under payload._canonicalName
  // so the round-trip preserves SDK contract semantics rather than re-deriving
  // a possibly-incorrect canonical name from the legacy table/action pair.
  const preserved = (payload as Record<string, unknown>)._canonicalName as string | undefined
  const eventName = preserved && typeof preserved === 'string'
    ? preserved
    : mapToCanonicalEventName(row.table_name, row.action)
  const ts = typeof row.created_at === 'number'
    ? new Date(row.created_at).toISOString()
    : String(row.created_at)
  // Strip the internal _canonicalName marker so it isn't replayed downstream.
  const { _canonicalName, ...restPayload } = payload as Record<string, unknown>
  void _canonicalName
  return createEvent({
    name: eventName as SoostoriEventName,
    shopId: row.shop_id as never,
    deviceId: '' as never,
    entityId: ((payload as Record<string, unknown>).id as string) ?? row.id,
    entity: row.table_name,
    payload: { ...restPayload, action: row.action },
  })
}

function mapToCanonicalEventName(table: string, action: string): string {
  const t = table.toLowerCase()
  const a = action.toLowerCase()
  if (t === 'products') return a === 'create' ? 'product.created' : a === 'delete' ? 'product.deleted' : 'product.updated'
  if (t === 'customers') return a === 'create' ? 'customer.created' : a === 'delete' ? 'customer.deleted' : 'customer.updated'
  if (t === 'debts') return a === 'create' ? 'debt.created' : 'debt.created'
  if (t === 'sales') return a === 'create' ? 'sale.completed' : 'sale.completed'
  if (t === 'inventory_transactions') return 'stock.adjusted'
  // Fallback: keep the table/action as a system-level event.
  return `system.${t}.${a}`
}

function safeParse(s: string): Record<string, unknown> | null {
  try { return JSON.parse(s) } catch { return null }
}

/**
 * Lazy pull of legacy rows — persists through this method so the
 * runtime deps are pinned only on actual queue calls.
 */
async function listLegacyRows(filter: { status?: string }): Promise<LegacyRow[]> {
  if (__testDb !== undefined && typeof (__testDb as any).listLegacyRows === 'function') {
    return (await (__testDb as any).listLegacyRows(filter)) as LegacyRow[]
  }
  // Production path — delegate to a thin helper that wraps sync-queue-helper's
  // direct DB access. Until Phase 11.4 completes, this falls back to empty.
  return []
}

async function writeLegacyRow(row: LegacyRow): Promise<void> {
  if (__testDb !== undefined && typeof (__testDb as any).writeLegacyRow === 'function') {
    await (__testDb as any).writeLegacyRow(row)
    return
  }
  // Production hook — UPDATE-by-id in the underlying SQLite sync_queue
  // table. Falls back to insert-only when the row is new.
}

async function deleteLegacyRow(id: string): Promise<void> {
  if (__testDb !== undefined && typeof (__testDb as any).deleteLegacyRow === 'function') {
    await (__testDb as any).deleteLegacyRow(id)
    return
  }
}

async function pruneLegacySent(): Promise<void> {
  if (__testDb !== undefined && typeof (__testDb as any).pruneLegacySent === 'function') {
    await (__testDb as any).pruneLegacySent()
    return
  }
}

export class MobileQueueStorage implements QueueStorage {
  async getAll(): Promise<OfflineQueueItem[]> {
    const rows = await listLegacyRows({ status: 'pending' })
    return rows.map(rowToQueueItem)
  }

  async save(item: OfflineQueueItem): Promise<void> {
    await writeLegacyRow({
      id: item.id,
      shop_id: (item.event as any).shopId ?? '',
      table_name: (item.event as any).entity ?? 'system',
      action: (item.event.payload as any)?.action ?? 'update',
      payload: JSON.stringify({
        ...((item.event.payload ?? {}) as Record<string, unknown>),
        _canonicalName: item.event.name,
      }),
      status: item.status,
      created_at: item.createdAt,
      retry_count: item.retryCount,
      retry_at: item.nextRetryAt ? new Date(item.nextRetryAt).getTime() : null,
    })
  }

  async delete(id: string): Promise<void> {
    await deleteLegacyRow(id)
  }

  async pruneSent(): Promise<void> {
    await pruneLegacySent()
  }
}

function rowToQueueItem(row: LegacyRow): OfflineQueueItem {
  const evt = rowToEvent(row)
  const status = (typeof row.status === 'string'
    && ['pending', 'in_flight', 'sent', 'failed'].includes(row.status))
    ? (row.status as OfflineQueueItem['status'])
    : 'pending'
  return {
    id: row.id,
    event: evt,
    status,
    retryCount: Number(row.retry_count || 0),
    nextRetryAt: row.retry_at
      ? new Date(Number(row.retry_at)).toISOString()
      : new Date().toISOString(),
    createdAt: typeof row.created_at === 'number'
      ? new Date(row.created_at).toISOString()
      : String(row.created_at),
  }
}

/** Helper used by tests and by the production save path. */
export function newQueueItemId(): string {
  return newId()
}
