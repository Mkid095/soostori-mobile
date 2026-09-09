// mobile-queue-conversion.ts — Row to event conversion for queue storage
import { newId } from '@soostori/core'
import { createEvent, type SoostoriEvent, type SoostoriEventName } from '@soostori/events'
import type { LegacyRow } from './mobile-queue-storage'

function safeParse(s: string): Record<string, unknown> | null {
  try { return JSON.parse(s) } catch { return null }
}

function mapToCanonicalEventName(table: string, action: string): string {
  const t = table.toLowerCase(), a = action.toLowerCase()
  if (t === 'products') return a === 'create' ? 'product.created' : a === 'delete' ? 'product.deleted' : 'product.updated'
  if (t === 'customers') return a === 'create' ? 'customer.created' : a === 'delete' ? 'customer.deleted' : 'customer.updated'
  if (t === 'debts') return a === 'create' ? 'debt.created' : 'debt.created'
  if (t === 'sales') return a === 'create' ? 'sale.completed' : 'sale.completed'
  if (t === 'inventory_transactions') return 'stock.adjusted'
  return `system.${t}.${a}`
}

export function rowToEvent(row: LegacyRow): SoostoriEvent {
  const payload = safeParse(row.payload) ?? {}
  const preserved = (payload as Record<string, unknown>)._canonicalName as string | undefined
  const eventName = preserved && typeof preserved === 'string' ? preserved : mapToCanonicalEventName(row.table_name, row.action)
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

export function newQueueItemId(): string { return newId() }
