// sync-apply-customer.ts — Phase 16: apply customer SyncEvent to local SQLite

import { getDb } from '../lib/db'
import type { SyncEvent } from '@soostori/contracts'
import type { SyncApplyResult } from '@soostori/contracts'

export async function applyCustomerEvent(
  database: Awaited<ReturnType<typeof getDb>>,
  event: SyncEvent,
): Promise<SyncApplyResult> {
  const p = event.payload as Record<string, unknown>

  if (event.operation === 'create' || event.operation === 'update') {
    database.runAsync(
      `INSERT OR REPLACE INTO customers
         (id, name, phone, id_number, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        event.entityId,
        String(p.name ?? ''),
        p.phone != null ? String(p.phone) : null,
        p.idNumber != null ? String(p.idNumber) : null,
        p.status === 'inactive' || p.status === 'blacklisted' ? 0 : 1,
        String(p.createdAt ?? event.clientCreatedAt),
        String(p.updatedAt ?? event.clientCreatedAt),
      ],
    )
    return { state: 'applied', entityVersion: event.entityVersion }
  }

  if (event.operation === 'tombstone' || event.operation === 'delete') {
    database.runAsync(
      `UPDATE customers SET is_active = 0, updated_at = ? WHERE id = ?`,
      [new Date().toISOString(), event.entityId],
    )
    return { state: 'applied', entityVersion: event.entityVersion }
  }

  return { state: 'no_op' }
}
