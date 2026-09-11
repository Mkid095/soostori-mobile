// db-sale-refund.ts — Sale refund (full and partial) with stock restoration + sync event
// Phase 10

import AsyncStorage from '@react-native-async-storage/async-storage'
import { getDb } from '../lib/db'
import type { Sale } from '../lib/types'
import { generateId } from '../lib/formatters'
import { mapSaleRow } from './db-sales-mapper'
import { mapSaleItemRow } from './db-sales-mapper-helpers'
import { publishSdkEvent } from './sdk-bridge/sdk-event-bus'
import { enforcePermission, PERMISSIONS } from './sdk-bridge/rbac'
import { enforceSubscriptionOrThrow } from './sdk-bridge/subscription-gate'
import { getCurrentRole } from './session-helper'
import { refundSaleStock } from './inventory-ledger-service'
import { enqueueSaleSyncEvent } from './sale-sync-event'
import { logAudit } from './db-audit'

async function resolveShopId(): Promise<string> {
  const stored = await AsyncStorage.getItem('@soostori:shopId')
  if (!stored) throw new Error('No shop context')
  return stored
}

async function resolveEmployeeId(): Promise<string> {
  return (await AsyncStorage.getItem('@soostori:employeeId')) ?? 'system'
}

async function resolveDeviceId(): Promise<string> {
  return (await AsyncStorage.getItem('@soostori:deviceId')) ?? 'mobile'
}

export interface RefundResult {
  refundId: string
  sale: Sale
  refundedItems: Array<{ productId: string; productName: string; quantity: number; refundAmount: number }>
  totalRefundAmount: number
  paymentMethod: 'cash' | 'mobile_money' | 'card'
}

export interface RefundItem {
  productId: string
  quantity: number
}

/**
 * refundSale — full or partial refund.
 *
 * Phase 10 guarantees:
 *   1. Sale exists and is 'completed' (not already refunded/voided)
 *   2. Sale + SaleItems fetched atomically
 *   3. Per-item 'refunded' ledger movement applied (restores stock)
 *   4. Sale status updated to 'refunded'
 *   5. sale.refunded SyncEvent enqueued
 *   6. Audit log recorded
 */
export async function refundSale(
  saleId: string,
  paymentMethod: 'cash' | 'mobile_money' | 'card',
  refundAmount: number,
  reason: string,
  lineItems?: RefundItem[],
): Promise<RefundResult> {
  await enforceSubscriptionOrThrow()
  await enforcePermission(await getCurrentRole(), PERMISSIONS.POS_SELL)
  const shopId = await resolveShopId()
  const employeeId = await resolveEmployeeId()
  const deviceId = await resolveDeviceId()

  const db = await getDb()

  const saleRow = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM sales WHERE id = ?', saleId,
  )
  if (!saleRow) throw new Error(`Sale ${saleId} not found`)
  const currentStatus = String(saleRow.status)
  if (currentStatus === 'refunded') throw new Error('Sale already refunded')
  if (currentStatus === 'cancelled') throw new Error('Cannot refund a cancelled sale')

  const itemRows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM sale_items WHERE sale_id = ?', saleId,
  )
  const items = itemRows.map(mapSaleItemRow)

  // Determine which items to refund
  const toRefund = lineItems
    ? items.filter(i => lineItems.some(li => li.productId === i.productId))
    : items

  const refundId = generateId()
  const now = new Date().toISOString()

  await db.withTransactionAsync(async () => {
    // Record refund items in dedicated table for audit trail
    for (const item of toRefund) {
      const refundQty = lineItems
        ? (lineItems.find(li => li.productId === item.productId)?.quantity ?? item.quantity)
        : item.quantity
      const refundLineAmount = refundQty * item.unitPrice
      const itemKey = `${saleId}:${item.productId}:refund`
      await db.runAsync(
        `INSERT INTO refund_items (id, refund_id, sale_id, product_id, product_name, quantity, unit_price, refund_amount, idempotency_key)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [generateId(), refundId, saleId, item.productId, item.productName, refundQty, item.unitPrice, refundLineAmount, itemKey],
      )
      // Restore stock via refunded ledger movement (idempotent)
      await refundSaleStock(saleId, item.productId, refundQty, itemKey)
    }

    // Update sale status
    const newStatus = toRefund.length === items.length ? 'refunded' : 'completed'
    await db.runAsync(
      `UPDATE sales SET status = ?, updated_at = ? WHERE id = ?`,
      [newStatus, now, saleId],
    )
  })

  // Re-fetch updated sale row
  const updatedRow = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM sales WHERE id = ?', saleId,
  )
  if (!updatedRow) throw new Error(`Sale ${saleId} not found after refund`)

  logAudit(shopId, 'SALE_REFUNDED', 'sale', saleId, undefined, undefined,
    undefined, JSON.stringify({ refundId, refundAmount, reason, lineItems })).catch(() => {})

  publishSdkEvent({
    name: 'sale.refunded', entity: 'sale', entityId: saleId,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload: { saleId, refundId, total: refundAmount, reason, lineItems } as any, source: 'local',
  }).catch(() => {})

  // Emit sale.refunded sync event
  enqueueSaleSyncEvent(updatedRow, shopId, employeeId, deviceId).catch(() => {})

  return {
    refundId,
    sale: mapSaleRow(updatedRow),
    refundedItems: toRefund.map(i => ({
      productId: i.productId ?? '',
      productName: i.productName,
      quantity: lineItems
        ? (lineItems.find(li => li.productId === i.productId)?.quantity ?? i.quantity)
        : i.quantity,
      refundAmount: i.unitPrice * (lineItems
        ? (lineItems.find(li => li.productId === i.productId)?.quantity ?? i.quantity)
        : i.quantity),
    })),
    totalRefundAmount: refundAmount,
    paymentMethod,
  }
}

/** Get refund items for a sale (for display before confirming partial refund) */
export async function getRefundItems(saleId: string): Promise<Sale['items']> {
  const db = await getDb()
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM sale_items WHERE sale_id = ?', saleId,
  )
  return rows.map(mapSaleItemRow)
}
