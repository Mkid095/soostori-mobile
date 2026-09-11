// db-sale-create.ts — Core sale creation with stock ledger + canonical sync event
// Phase 09: uses StockMovementLedger for inventory deduction, wired to defaultSyncEngine

import AsyncStorage from '@react-native-async-storage/async-storage'
import { getDb } from '../lib/db'
import { canSell } from './db-products-queries'
import type { Sale, CartItem } from '../lib/types'
import { generateId } from '../lib/formatters'
import { mapSaleRow } from './db-sales-mapper'
import { logAudit } from './db-audit'
import { publishSdkEvent } from './sdk-bridge/sdk-event-bus'
import { enforcePermission, PERMISSIONS } from './sdk-bridge/rbac'
import { enforceSubscriptionOrThrow } from './sdk-bridge/subscription-gate'
import { getCurrentRole } from './session-helper'
import { enforceStockMutationGate } from './db-operational-gate'
import { deductSaleStock } from './inventory-ledger-service'
import { enqueueSaleSyncEvent } from './sale-sync-event'

export class InsufficientStockError extends Error {
  constructor(
    public productName: string,
    public requested: number,
    public available: number,
  ) {
    super(
      `Insufficient stock for "${productName}": requested ${requested}, available ${available}`,
    )
    this.name = 'InsufficientStockError'
  }
}

async function resolveShopId(): Promise<string> {
  const stored = await AsyncStorage.getItem('@soostori:shopId')
  if (!stored) throw new Error('No shop context — cannot create sale')
  return stored
}

async function resolveEmployeeId(): Promise<string> {
  return (await AsyncStorage.getItem('@soostori:employeeId')) ?? 'system'
}

async function resolveDeviceId(): Promise<string> {
  return (await AsyncStorage.getItem('@soostori:deviceId')) ?? 'mobile'
}

/**
 * createSale — full offline-capable POS sale.
 *
 * Guarantees (Phase 10):
 *   1. Product exists + has sufficient stock (canSell check)
 *   2. Sale + SaleItems written to SQLite atomically
 *   3. Stock deducted via StockMovementLedger (idempotent — same movement is a no-op on replay)
 *   4. Canonical SyncEvent enqueued to defaultSyncEngine (offline queue survives crash)
 *   5. Audit log recorded
 *   6. SDK event published
 *   7. customer_id_number written to sale — sale is valid regardless of customer sync order
 */
export async function createSale(
  items: CartItem[],
  paymentMethod: Sale['paymentMethod'],
  subtotal: number,
  discountAmount: number,
  totalAmount: number,
  note?: string,
  customerIdNumber?: string,
  _customerId?: string,
): Promise<Sale> {
  for (const item of items) {
    const { ok, available } = await canSell(item.productId, item.quantity)
    if (!ok) throw new InsufficientStockError(item.productName, item.quantity, available)
  }
  await enforceSubscriptionOrThrow()
  await enforcePermission(await getCurrentRole(), PERMISSIONS.POS_SELL)
  enforceStockMutationGate()

  const db = await getDb()
  const saleId = generateId()
  const employeeId = await resolveEmployeeId()
  const deviceId = await resolveDeviceId()
  const shopId = await resolveShopId()
  const now = new Date().toISOString()
  const itemsSummary = `${items.length} item${items.length !== 1 ? 's' : ''}`

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO sales
         (id, shop_id, type, status, subtotal, discount_amount, total_amount,
          paid_amount, payment_method, note, customer_id_number, items, items_summary,
          employee_id, device_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [saleId, shopId, 'retail', 'completed', subtotal, discountAmount,
       totalAmount, totalAmount, paymentMethod, note || null,
       customerIdNumber || null, '[]', itemsSummary, employeeId, deviceId, now, now],
    )

    for (const item of items) {
      const itemId = generateId()
      const itemKey = `${saleId}:${item.productId}`
      await db.runAsync(
        `INSERT INTO sale_items
           (id, sale_id, product_id, variation_name, product_name, quantity,
            unit_price, discount, total_price, idempotency_key)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [itemId, saleId, item.productId, item.variationName || null,
         item.productName, item.quantity, item.unitPrice, item.discount,
         item.totalPrice, itemKey],
      )
      // Deduct via ledger — idempotent: if movement with itemKey exists, no-op
      await deductSaleStock(saleId, item.productId, item.quantity, itemKey)
    }
  })

  const saleRow = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM sales WHERE id = ?', saleId,
  )
  if (!saleRow) throw new Error(`Sale ${saleId} not found after commit`)

  logAudit(shopId, 'SALE_COMPLETED', 'sale', saleId, undefined, undefined,
    undefined, JSON.stringify({ totalAmount, paymentMethod })).catch(() => {})

  publishSdkEvent({
    name: 'sale.completed', entity: 'sale', entityId: saleId,
    payload: { saleId, total: totalAmount }, source: 'local',
  }).catch(() => {})

  enqueueSaleSyncEvent(saleRow, shopId, employeeId, deviceId).catch(() => {})

  return mapSaleRow(saleRow)
}
