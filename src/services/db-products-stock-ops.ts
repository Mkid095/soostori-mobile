// db-products-stock-ops.ts — Stock adjustment operations
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getDb } from '../lib/db'
import { getProductById } from './db-products-queries'
import { recordInventoryTransaction } from './db-inventory-transactions'
import { logAudit } from './db-audit'
import { enforcePermission, PERMISSIONS } from './sdk-bridge/rbac'
import { enforceSubscriptionOrThrow } from './sdk-bridge/subscription-gate'
import { getCurrentRole } from './session-helper'
import { enforceStockMutationGate } from './db-operational-gate'

async function resolveProductShopId(): Promise<string> {
  const stored = await AsyncStorage.getItem('@soostori:shopId')
  if (!stored) throw new Error('No shop context')
  return stored
}

export async function adjustStock(
  productId: string,
  quantity: number,
  reason: string,
  shopId?: string,
): Promise<void> {
  await enforceSubscriptionOrThrow()
  await enforcePermission(await getCurrentRole(), PERMISSIONS.INVENTORY_ADJUST)
  enforceStockMutationGate()
  const shop = shopId ?? await resolveProductShopId()
  const prod = await getProductById(productId)
  const delta = quantity > 0 ? `+${quantity}` : `${quantity}`
  await logAudit(
    shop, 'STOCK_ADJUSTED', 'product', productId,
    undefined, undefined,
    JSON.stringify({ stock: prod?.stockQuantity }),
    JSON.stringify({ stock: prod?.stockQuantity, delta }),
    reason,
  )
  await recordInventoryTransaction(
    shop, productId, quantity > 0 ? 'PURCHASE' : 'ADJUSTMENT',
    Math.abs(quantity), undefined, undefined, undefined, undefined, undefined, reason,
  )
}
