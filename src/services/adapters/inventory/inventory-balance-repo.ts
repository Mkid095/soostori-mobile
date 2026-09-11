/**
 * inventory-balance-repo.ts — Phase 09
 * StockBalance + StockMovement persistence helpers.
 * Used by MobileInventoryRepository to keep stock_balances cache in sync.
 */

import { getDb } from '../../../lib/db'
import type { UUID, ISO8601 } from '@soostori/core'
import type { StockBalance, StockSummary } from '@soostori/inventory'

function now(): string {
  return new Date().toISOString()
}

export async function getStockBalance(
  productId: UUID,
): Promise<StockBalance | null> {
  const db = await getDb()
  const row = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM stock_balances WHERE product_id = ?',
    [productId],
  )
  if (row) {
    return {
      productId: row.product_id as UUID,
      shopId: (row.shop_id ?? '') as UUID,
      productVariantId: null,
      quantity: Number(row.quantity ?? 0),
      reservedQuantity: Number(row.reserved ?? 0),
      lastSequence: Number(row.last_seq ?? 0),
      updatedAt: String(row.updated_at ?? new Date().toISOString()) as ISO8601,
    }
  }
  // Fallback: derive from products.current_stock
  const prod = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT current_stock, shop_id FROM products WHERE id = ?',
    [productId],
  )
  if (!prod) return null
  return {
    productId,
    shopId: (prod.shop_id as UUID) ?? ('' as UUID),
    productVariantId: null,
    quantity: Number(prod.current_stock ?? 0),
    reservedQuantity: 0,
    lastSequence: 0,
    updatedAt: new Date().toISOString() as ISO8601,
  }
}

export async function upsertStockBalance(
  productId: UUID,
  shopId: UUID,
  quantity: number,
  reserved: number,
  lastSeq: number,
): Promise<void> {
  const db = await getDb()
  const now = new Date().toISOString()
  await db.runAsync(
    `INSERT OR REPLACE INTO stock_balances
       (product_id, shop_id, quantity, reserved, last_seq, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [productId, shopId, quantity, reserved, lastSeq, now],
  )
  // Keep products.current_stock in sync
  await db.runAsync(
    'UPDATE products SET current_stock = ? WHERE id = ?',
    [quantity, productId],
  )
}

export async function getStockSummary(
  shopId: UUID,
  productId: UUID,
): Promise<StockSummary | null> {
  const db = await getDb()
  const prod = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT name FROM products WHERE id = ?',
    [productId],
  )
  const movements = await db.getAllAsync<Record<string, unknown>>(
    `SELECT type, quantity, timestamp FROM inventory_transactions
       WHERE product_id = ? ORDER BY timestamp ASC`,
    [productId],
  )

  let totalReceived = 0
  let totalSold = 0
  let totalAdjusted = 0
  let totalTransferred = 0
  let lastAt: ISO8601 | null = null

  for (const m of movements) {
    const qty = Math.abs(Number(m.quantity ?? 0))
    const t = String(m.type ?? '').toUpperCase()
    if (t === 'RECEIVED' || t === 'PURCHASE') totalReceived += qty
    else if (t === 'SOLD') totalSold += qty
    else if (t === 'ADJUSTED' || t === 'DAMAGE' || t === 'CORRECTION') totalAdjusted += qty
    else if (t === 'TRANSFERRED') totalTransferred += qty
    const ts = String(m.timestamp ?? '')
    if (ts && (!lastAt || ts > lastAt)) lastAt = ts as ISO8601
  }

  const last = movements[movements.length - 1]

  return {
    productId,
    productName: (prod?.name as string) ?? '',
    shopId,
    currentQuantity: Number(last?.quantity ?? 0),
    totalReceived,
    totalSold,
    totalAdjusted,
    totalTransferred,
    lastMovementAt: lastAt,
  }
}

function now(): string {
  return new Date().toISOString()
}
