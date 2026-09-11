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
import { defaultSyncEngine } from '@soostori/contracts'
import { fromLocalStockMovement } from '../lib/contracts-mapper'
import { generateId } from '../lib/formatters'
import { triggerSync } from './mobile-sync-service'
import type { StockMovement } from '@soostori/contracts'

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
  if (!prod) throw new Error(`Product ${productId} not found`)
  const newStock = prod.stockQuantity + quantity
  if (newStock < 0) {
    throw new Error(`Adjustment would result in negative stock (${newStock}). Current: ${prod.stockQuantity}, delta: ${quantity}.`)
  }
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
  ).then((tx) => {
    enqueueStockMovementSyncEvent(tx, reason)
      .then(() => triggerSync())
      .catch(() => { /* swallow — local DB is source of truth */ })
  })
}

async function enqueueStockMovementSyncEvent(
  tx: { id: string; shopId: string; productId: string; type: string; quantity: number; balanceAfter: number; timestamp: string },
  adjustmentReason?: string,
): Promise<void> {
  const businessId = await resolveProductShopId()
  if (!businessId) return
  // Build a synthetic DB row so fromLocalStockMovement maps the canonical shape
  const row: Record<string, unknown> = {
    id: tx.id,
    shop_id: tx.shopId,
    product_id: tx.productId,
    type: tx.type === 'PURCHASE' ? 'PURCHASE' : 'ADJUSTMENT',
    quantity: tx.quantity,
    balance_after: tx.balanceAfter,
    created_by: null,
    device_id: null,
    reference_id: null,
    reason: adjustmentReason ?? null,
    timestamp: tx.timestamp,
    created_at: tx.timestamp,
  }
  const sm = fromLocalStockMovement(row)
  await defaultSyncEngine.enqueue({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    id: generateId() as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    idempotencyKey: sm.idempotencyKey as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    businessId: sm.businessId as any,
    entityKind: 'stockMovement',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    entityId: String(sm.id) as any,
    operation: 'create',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    originatingDeviceId: String(sm.businessId) as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    originatingEmployeeId: 'system' as any,
    clientSequence: Date.now(),
    clientCreatedAt: sm.timestamp,
    entityVersion: sm.version,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload: sm as any,
    state: 'pending',
  })
}
