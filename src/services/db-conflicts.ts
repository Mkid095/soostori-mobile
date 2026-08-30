// Sync conflict CRUD + partial fulfillment — Phase 3 conflict handling
import { getDb } from '../lib/db'
import type { SyncConflict } from '../lib/sync-protocol'
import { generateId } from '../lib/formatters'

export type ConflictResolution = 'PARTIAL_FULFILL' | 'CANCEL' | 'ESCALATE'

function mapRow(row: Record<string, unknown>): SyncConflict {
  return {
    id: String(row.id),
    shopId: String(row.shop_id),
    saleId: String(row.sale_id),
    deviceId: String(row.device_id),
    conflictType: String(row.conflict_type),
    status: String(row.status) as SyncConflict['status'],
    originalPayload: String(row.original_payload),
    resolution: row.resolution ? String(row.resolution) : undefined,
    resolvedBy: row.resolved_by ? String(row.resolved_by) : undefined,
    createdAt: String(row.created_at),
  }
}

export async function createConflict(
  shopId: string,
  saleId: string,
  deviceId: string,
  conflictType: string,
  originalPayload: string,
): Promise<SyncConflict> {
  const db = await getDb()
  const id = generateId()
  const now = new Date().toISOString()
  await db.runAsync(
    `INSERT INTO sync_conflicts (id, shop_id, sale_id, device_id, conflict_type, status, original_payload, created_at)
     VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)`,
    [id, shopId, saleId, deviceId, conflictType, originalPayload, now]
  )
  return { id, shopId, saleId, deviceId, conflictType, status: 'pending', originalPayload, createdAt: now }
}

export async function getPendingConflicts(shopId: string): Promise<SyncConflict[]> {
  const db = await getDb()
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM sync_conflicts WHERE shop_id = ? AND status = 'pending' ORDER BY created_at ASC`,
    [shopId]
  )
  return rows.map(mapRow)
}

export async function resolveConflict(
  conflictId: string,
  resolution: ConflictResolution,
  resolvedBy: string,
  partialQuantities?: Record<string, number>,
): Promise<void> {
  const db = await getDb()
  const now = new Date().toISOString()
  const resolutionPayload = partialQuantities ? JSON.stringify(partialQuantities) : null
  if (resolutionPayload) {
    await db.runAsync(
      `UPDATE sync_conflicts SET status = 'resolved', resolution = ?, resolved_by = ?, created_at = ? WHERE id = ?`,
      [`${resolution}:${resolutionPayload}`, resolvedBy, now, conflictId]
    )
  } else {
    await db.runAsync(
      `UPDATE sync_conflicts SET status = 'resolved', resolution = ?, resolved_by = ?, created_at = ? WHERE id = ?`,
      [resolution, resolvedBy, now, conflictId]
    )
  }
}

// Apply partial fulfillment to inventory — restores available stock for fulfilled items
export async function applyPartialFulfillment(
  conflictId: string,
  partialQuantities: Record<string, number>,
): Promise<void> {
  const db = await getDb()
  for (const [productId, qty] of Object.entries(partialQuantities)) {
    if (qty <= 0) continue
    const row = await db.getFirstAsync<Record<string, unknown>>(
      'SELECT current_stock FROM products WHERE id = ?', [productId]
    )
    const currentStock = row ? Number(row.current_stock) || 0 : 0
    const newStock = currentStock + qty
    await db.runAsync(
      'UPDATE products SET current_stock = ?, updated_at = ? WHERE id = ?',
      [newStock, new Date().toISOString(), productId]
    )
    await db.runAsync(
      `INSERT INTO inventory_transactions (id, shop_id, product_id, type, quantity, balance_after, reason, timestamp)
       VALUES (?, 'default', ?, 'ADJUSTMENT', ?, ?, 'Partial fulfillment of conflict ?', ?)`,
      [generateId(), productId, qty, newStock, conflictId, new Date().toISOString()]
    )
  }
}
