// lan-client-messages.ts — Message handlers for LAN client
import { getDb } from '../lib/db'
import type {
  SaleConfirmedPayload,
  SaleRejectedPayload,
  StockUpdatedPayload,
  SaleReconciliationRequiredPayload,
} from '../lib/sync-protocol'
import { recordInventoryTransaction } from './db-inventory-transactions'

/**
 * Apply SALE_CONFIRMED event — update sale status and deduct stock.
 * Idempotent: skips if already confirmed.
 */
export async function applySaleConfirmed(payload: SaleConfirmedPayload): Promise<void> {
  const db = await getDb()

  const existing = await db.getFirstAsync<Record<string, unknown>>(
    `SELECT status FROM sales WHERE id = ?`, [payload.saleId]
  )
  if (!existing || existing.status === 'confirmed') return

  await db.runAsync(
    `UPDATE sales SET status = 'confirmed', updated_at = ? WHERE id = ?`,
    [payload.timestamp, payload.saleId]
  )

  // Deduct stock via inventory transaction for proper event sourcing
  for (const item of payload.items) {
    if (item.variantName) {
      await db.runAsync(
        `UPDATE product_variants SET stock_quantity = stock_quantity - ? WHERE product_id = ? AND name = ? AND is_active = 1`,
        [item.quantity, item.productId, item.variantName]
      )
    }
    // Record inventory transaction (canonical source of truth)
    await recordInventoryTransaction(
      'default', item.productId, 'SALE', item.quantity,
      undefined, undefined, item.variantName || undefined, payload.saleId
    )
  }
}

/**
 * Apply SALE_REJECTED event — mark sale as rejected.
 * Idempotent: skips if already rejected.
 * Phase 16: if rejection is due to insufficient stock, also create a
 * SaleReconciliationRequired conflict in sync_conflicts with ESCALATE resolution.
 */
export async function applySaleRejected(payload: SaleRejectedPayload): Promise<void> {
  const db = await getDb()

  const existing = await db.getFirstAsync<Record<string, unknown>>(
    `SELECT status FROM sales WHERE id = ?`, [payload.saleId]
  )
  if (!existing || existing.status === 'rejected') return

  await db.runAsync(
    `UPDATE sales SET status = 'rejected', updated_at = ? WHERE id = ?`,
    [payload.timestamp, payload.saleId]
  )

  // Phase 16: insufficient stock → escalate to sync_conflicts
  if (payload.reason?.toLowerCase().includes('insufficient') ||
      payload.reason?.toLowerCase().includes('stock')) {
    const { createConflict } = await import('./db-conflicts')
    // Re-fetch full row to get items for reconciliation payload
    const saleRow = await db.getFirstAsync<Record<string, unknown>>(
      `SELECT items FROM sales WHERE id = ?`, [payload.saleId]
    )
    const itemsJson = saleRow?.items ?? '[]'
    const items: Array<{ productId: string; productName: string; quantity?: number }> =
      typeof itemsJson === 'string' ? JSON.parse(itemsJson) : itemsJson
    const reconciliationPayload = {
      type: 'SALE_RECONCILIATION_REQUIRED' as const,
      saleId: payload.saleId,
      deviceId: 'cloud',
      reason: payload.reason,
      items: items.map(i => ({
        productId: i.productId,
        productName: i.productName ?? 'Unknown',
        requestedQty: i.quantity ?? 0,
        availableQty: 0,
      })),
      timestamp: payload.timestamp,
    }
    await createConflict(
      'default',
      payload.saleId,
      'cloud',
      'INSUFFICIENT_STOCK',
      JSON.stringify(reconciliationPayload),
    )
  }
}

/**
 * Apply STOCK_UPDATED event — update product or variant stock.
 */
export async function applyStockUpdated(payload: StockUpdatedPayload): Promise<void> {
  const db = await getDb()
  if (payload.variantName) {
    await db.runAsync(
      `UPDATE product_variants SET stock_quantity = ? WHERE product_id = ? AND name = ? AND is_active = 1`,
      [payload.newBalance, payload.productId, payload.variantName]
    )
  } else {
    await db.runAsync(
      `UPDATE products SET stock_quantity = ? WHERE id = ? AND is_active = 1`,
      [payload.newBalance, payload.productId]
    )
  }
}

/**
 * Apply SALE_RECONCILIATION_REQUIRED event — create a conflict record.
 */
export async function applySaleReconciliationRequired(payload: SaleReconciliationRequiredPayload): Promise<void> {
  const db = await getDb()
  const { createConflict } = await import('./db-conflicts')
  await createConflict(
    'default',
    payload.saleId,
    payload.deviceId,
    'STOCK_CONFLICT',
    JSON.stringify(payload)
  )
}
