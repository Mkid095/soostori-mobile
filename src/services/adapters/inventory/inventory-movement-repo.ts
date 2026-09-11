/**
 * inventory-movement-repo.ts — Phase 09
 * StockMovement read/write helpers for MobileInventoryRepository.
 */

import { getDb } from '../../../lib/db'
import type { UUID, ISO8601 } from '@soostori/core'
import type { StockMovement, MovementFilter, PaginationOptions } from '@soostori/inventory'

function normalizeType(raw: string): StockMovement['type'] {
  const map: Record<string, StockMovement['type']> = {
    SALE: 'sold', SALE_CANCELLED: 'released', SALE_RETURNED: 'returned',
    RETURN: 'returned', PURCHASE: 'received', RECEIVE: 'received',
    RECEIVED: 'received', ADJUSTMENT: 'adjusted', ADJUST: 'adjusted',
    DAMAGE: 'adjusted', CORRECTION: 'adjusted', TRANSFER: 'transferred',
    OPENING_STOCK: 'received', OPENING: 'received', REFUND: 'refunded',
    RESERVED: 'reserved', RELEASED: 'released',
  }
  return map[raw.toUpperCase()] ?? 'adjusted'
}

export function rowToMovement(row: Record<string, unknown>): StockMovement {
  return {
    id: row.id as UUID,
    shopId: (row.shop_id ?? '') as UUID,
    productId: row.product_id as UUID,
    productVariantId: (row.variant_id as UUID) ?? null,
    type: normalizeType(String(row.type ?? row.event_type ?? 'adjusted')),
    quantity: Number(row.quantity ?? 0),
    balanceAfter: Number(row.balance_after ?? 0),
    referenceId: (row.reference_id as string) ?? null,
    referenceType: null,
    reason: (row.reason as string) ?? null,
    actorType: 'employee',
    actorId: (row.created_by as UUID) ?? null,
    deviceId: (row.device_id as UUID) ?? ('' as UUID),
    timestamp: String(row.timestamp ?? row.created_at ?? new Date().toISOString()) as ISO8601,
    sequence: Number(row.sequence_number ?? row.seq ?? 0),
    idempotencyKey: ((row.idempotency_key ?? row.id) as UUID) ?? ('' as UUID),
    syncedAt: (row.synced_at as ISO8601) ?? null,
  }
}

export async function getMovement(id: UUID): Promise<StockMovement | null> {
  const db = await getDb()
  const row = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM inventory_transactions WHERE id = ?', [id],
  )
  return row ? rowToMovement(row) : null
}

export async function listMovements(
  filter?: MovementFilter,
  pagination?: PaginationOptions,
): Promise<StockMovement[]> {
  const db = await getDb()
  const conditions: string[] = []
  const args: unknown[] = []

  if (filter?.productId) {
    conditions.push('product_id = ?'); args.push(filter.productId)
  }
  if (filter?.type) {
    conditions.push('type = ?'); args.push(filter.type)
  }
  if (filter?.startDate) {
    conditions.push('timestamp >= ?'); args.push(filter.startDate)
  }
  if (filter?.endDate) {
    conditions.push('timestamp <= ?'); args.push(filter.endDate)
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const limit = pagination?.limit ?? 50
  const offset = pagination?.offset ?? 0

  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM inventory_transactions ${where} ORDER BY timestamp ASC LIMIT ? OFFSET ?`,
    [...args, limit, offset],
  )
  return rows.map(rowToMovement)
}

export async function appendMovement(movement: StockMovement): Promise<void> {
  const db = await getDb()
  await db.runAsync(
    `INSERT INTO inventory_transactions
       (id, shop_id, product_id, variant_id, type, quantity, balance_after,
        reason, reference_id, created_by, device_id, timestamp, idempotency_key)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      movement.id, movement.shopId, movement.productId,
      movement.productVariantId ?? null, movement.type, movement.quantity,
      movement.balanceAfter, movement.reason ?? null, movement.referenceId ?? null,
      movement.actorId ?? null, movement.deviceId ?? null,
      movement.timestamp, movement.idempotencyKey,
    ],
  )
}

export async function hasMovementByKey(idempotencyKey: UUID): Promise<boolean> {
  const db = await getDb()
  const row = await db.getFirstAsync<{ cnt: number }>(
    'SELECT COUNT(*) as cnt FROM inventory_transactions WHERE idempotency_key = ?',
    [idempotencyKey],
  )
  return (row?.cnt ?? 0) > 0
}

export async function getLatestMovement(productId: UUID): Promise<StockMovement | null> {
  const db = await getDb()
  const row = await db.getFirstAsync<Record<string, unknown>>(
    `SELECT * FROM inventory_transactions
       WHERE product_id = ? AND variant_id IS NULL
       ORDER BY timestamp DESC LIMIT 1`,
    [productId],
  )
  return row ? rowToMovement(row) : null
}
