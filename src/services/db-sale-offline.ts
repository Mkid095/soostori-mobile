// db-sale-offline.ts — Offline sale creation (pending_offline status)
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getDb } from '../lib/db'
import type { Sale, CartItem } from '../lib/types'
import { generateId } from '../lib/formatters'
import { queueSync } from './sync-queue-helper'
import { mapSaleRow } from './db-sales-mapper'
import { recordInventoryTransaction } from './db-inventory-transactions'
import { publishSdkEvent } from './sdk-bridge/sdk-event-bus'
import { enforcePermission, PERMISSIONS } from './sdk-bridge/rbac'
import { enforceSubscriptionOrThrow } from './sdk-bridge/subscription-gate'
import { getCurrentRole } from './session-helper'
import { enforceStockMutationGate } from './db-operational-gate'

async function resolveShopId(): Promise<string> {
  const stored = await AsyncStorage.getItem('@soostori:shopId')
  if (!stored) throw new Error('No shop context — cannot create sale')
  return stored
}

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
  const id = generateId()
  const now = new Date().toISOString()
  const shopId = await resolveShopId()
  const itemsSummary = `${items.length} item${items.length !== 1 ? 's' : ''}`
  const itemsJson = JSON.stringify(items)

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO sales
        (id, type, status, subtotal, discount_amount, total_amount, paid_amount,
         payment_method, items, items_summary, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, 'retail', 'pending_offline', subtotal, discountAmount, totalAmount,
        totalAmount, paymentMethod, itemsJson, itemsSummary, now, now,
      ],
    )

    for (const item of items) {
      const itemId = generateId()
      await db.runAsync(
        `INSERT INTO sale_items
          (id, sale_id, product_id, variation_name, product_name, quantity, unit_price, discount, total_price)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          itemId, id, item.productId, item.variationName || null,
          item.productName, item.quantity, item.unitPrice, item.discount, item.totalPrice,
        ],
      )
      await recordInventoryTransaction(
        shopId,
        item.productId,
        'SALE',
        item.quantity,
        undefined,
        undefined,
        item.variationName || undefined,
        id,
      )
    }
  })
  const sale = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM sales WHERE id = ?', id,
  )
  if (!sale) throw new Error(`Sale ${id} not found after commit — transaction may have failed`)

  queueSync('sales', 'create', id, shopId).catch(() => {})
  publishSdkEvent({
    name: 'sale.completed',
    entity: 'sale',
    entityId: id,
    payload: { saleId: id, total: totalAmount },
    source: 'local',
  }).catch(() => {})

  return mapSaleRow(sale)
}
