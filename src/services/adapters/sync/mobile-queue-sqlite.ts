// mobile-queue-sqlite.ts — SQLite implementation of MobileQueueStorage
import type { OfflineQueueItem } from '@soostori/sync'
import type { LegacyRow } from './mobile-queue-storage'
import { rowToEvent, newQueueItemId } from './mobile-queue-conversion'

/* eslint-disable @typescript-eslint/no-explicit-any */
let __testDb: unknown = undefined
export function __setMobileQueueStorageDbForTesting(db: unknown): void { __testDb = db }

export function rowToQueueItem(row: LegacyRow): OfflineQueueItem {
  const evt = rowToEvent(row)
  const status = (typeof row.status === 'string' && ['pending', 'in_flight', 'sent', 'failed'].includes(row.status))
    ? (row.status as OfflineQueueItem['status']) : 'pending'
  return {
    id: row.id, event: evt, status,
    retryCount: Number(row.retry_count || 0),
    nextRetryAt: row.retry_at ? new Date(Number(row.retry_at)).toISOString() : new Date().toISOString(),
    createdAt: typeof row.created_at === 'number' ? new Date(row.created_at).toISOString() : String(row.created_at),
  }
}

async function listLegacyRows(filter: { status?: string }): Promise<LegacyRow[]> {
  if (__testDb !== undefined && typeof (__testDb as any).listLegacyRows === 'function')
    return (await (__testDb as any).listLegacyRows(filter)) as LegacyRow[]
  return []
}

async function writeLegacyRow(row: LegacyRow): Promise<void> {
  if (__testDb !== undefined && typeof (__testDb as any).writeLegacyRow === 'function')
    await (__testDb as any).writeLegacyRow(row)
}

async function deleteLegacyRow(id: string): Promise<void> {
  if (__testDb !== undefined && typeof (__testDb as any).deleteLegacyRow === 'function')
    await (__testDb as any).deleteLegacyRow(id)
}

async function pruneLegacySent(): Promise<void> {
  if (__testDb !== undefined && typeof (__testDb as any).pruneLegacySent === 'function')
    await (__testDb as any).pruneLegacySent()
}

export class MobileQueueSqlite {
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
      payload: JSON.stringify({ ...((item.event.payload ?? {}) as Record<string, unknown>), _canonicalName: item.event.name }),
      status: item.status,
      created_at: item.createdAt,
      retry_count: item.retryCount,
      retry_at: item.nextRetryAt ? new Date(item.nextRetryAt).getTime() : null,
    })
  }

  async delete(id: string): Promise<void> { await deleteLegacyRow(id) }
  async pruneSent(): Promise<void> { await pruneLegacySent() }
}

export { newQueueItemId }
