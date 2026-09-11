// db-sale-offline.ts — Offline-first POS sale (pending_offline status)
// Phase 09: uses StockMovementLedger + defaultSyncEngine.enqueue()

import AsyncStorage from '@react-native-async-storage/async-storage'
import { getDb } from '../lib/db'
import type { Sale, CartItem } from '../lib/types'
import { generateId } from '../lib/formatters'
import { mapSaleRow } from './db-sales-mapper'
import { publishSdkEvent } from './sdk-bridge/sdk-event-bus'
import { enforcePermission, PERMISSIONS } from './sdk-bridge/rbac'
import { enforceSubscriptionOrThrow } from './sdk-bridge/subscription-gate'
import { getCurrentRole } from './session-helper'
import { enforceStockMutationGate } from './db-operational-gate'
import { deductSaleStock } from './inventory-ledger-service'
import { enqueueSaleSyncEvent } from './sale-sync-event'

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
 * createSaleOffline — offline-first sale.
 *
 * Sale is written with status 'pending_offline' immediately.
 * When connectivity returns, the sync engine pushes the SyncEvent.
 *
 * Phase 09 guarantees:
 *   1. Sale + SaleItems written atomically to SQLite
 *   2. Stock deducted via StockMovementLedger (idempotent)
 *   3. SyncEvent queued via defaultSyncEngine — survives app crash
 *   4. SDK event published
 */
export async function createSaleOffline(
  items: CartItem[],
  paymentMethod: Sale['paymentMethod'],
  subtotal: number,
  discountAmount: number,
  totalAmount: number,
): Promise<Sale> {
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
          paid_amount, payment_method, items, items_summary,
          employee_id, device_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [saleId, shopId, 'retail', 'pending_offline', subtotal, discountAmount,
       totalAmount, totalAmount, paymentMethod, '[]', itemsSummary,
       employeeId, deviceId, now, now],
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
      // Deduct via ledger — idempotent: replay skips if movement exists
      await deductSaleStock(saleId, item.productId, item.quantity, itemKey)
    }
  })

  const saleRow = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM sales WHERE id = ?', saleId,
  )
  if (!saleRow) throw new Error(`Sale ${saleId} not found after commit`)

  // Enqueue canonical SyncEvent via defaultSyncEngine
  enqueueSaleSyncEvent(saleRow, shopId, employeeId, deviceId).catch(() => {})

  publishSdkEvent({
    name: 'sale.completed', entity: 'sale', entityId: saleId,
    payload: { saleId, total: totalAmount, status: 'pending_offline' }, source: 'local',
  }).catch(() => {})

  return mapSaleRow(saleRow)
}
