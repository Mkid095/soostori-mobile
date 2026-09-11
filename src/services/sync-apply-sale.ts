// sync-apply-sale.ts — Phase 16: apply sale SyncEvent to local SQLite

import { getDb } from '../lib/db'
import type { SyncEvent } from '@soostori/contracts'
import type { SyncApplyResult } from '@soostori/contracts'

export async function applySaleEvent(
  database: Awaited<ReturnType<typeof getDb>>,
  event: SyncEvent,
): Promise<SyncApplyResult> {
  const p = event.payload as Record<string, unknown>

  if (event.operation === 'create') {
    const itemsJson = Array.isArray(p.items) ? JSON.stringify(p.items) : '[]'
    database.runAsync(
      `INSERT OR REPLACE INTO sales
         (id, shop_id, type, status, subtotal, discount_amount, total_amount,
          paid_amount, payment_method, note, customer_id_number, items, items_summary,
          created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        event.entityId,
        event.businessId,
        String(p.type ?? 'retail'),
        String(p.status ?? 'completed'),
        Number(p.subtotal ?? 0),
        Number(p.discountAmount ?? 0),
        Number(p.totalAmount ?? 0),
        Number(p.paidAmount ?? p.totalAmount ?? 0),
        String(p.paymentMethod ?? 'cash'),
        p.note != null ? String(p.note) : null,
        p.customerId != null ? String(p.customerId) : null,
        itemsJson,
        `${Array.isArray(p.items) ? p.items.length : 0} items`,
        String(p.createdAt ?? event.clientCreatedAt),
        String(p.updatedAt ?? event.clientCreatedAt),
      ],
    )
    return { state: 'applied', entityVersion: event.entityVersion }
  }

  return { state: 'no_op' }
}
