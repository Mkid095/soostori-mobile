// db-products-update.ts — Product update and delete logic
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getDb } from '../lib/db'
import type { Product } from '../lib/types'
import { getProductById } from './db-products-queries'
import { queueSync } from './sync-queue-helper'
import { enforcePermission, PERMISSIONS } from './sdk-bridge/rbac'
import { enforceSubscriptionOrThrow } from './sdk-bridge/subscription-gate'
import { getCurrentRole, getCurrentShopId } from './session-helper'
import { FIELD_MAP } from './db-products-field-map'
import { defaultSyncEngine } from '@soostori/contracts'
import { fromLocalProduct } from '../lib/contracts-mapper'
import { generateId } from '../lib/formatters'
import { triggerSync } from './mobile-sync-service'

async function resolveShopId(): Promise<string> {
  const stored = await AsyncStorage.getItem('@soostori:shopId')
  if (!stored) throw new Error('No shop context')
  return stored
}

export async function updateProduct(id: string, data: Partial<Product>): Promise<Product> {
  await enforceSubscriptionOrThrow()
  await enforcePermission(await getCurrentRole(), PERMISSIONS.INVENTORY_EDIT)
  const shopId = await resolveShopId()
  const oldProduct = await getProductById(id)
  const priceChanged = data.sellingPrice !== undefined || data.costPrice !== undefined
  const db = await getDb()
  const now = new Date().toISOString()
  const sets: string[] = ['updated_at = ?']
  const values: (string | number | null)[] = [now]

  for (const f of FIELD_MAP) {
    const v = data[f.js]
    if (v === undefined) continue
    sets.push(`${f.col} = ?`)
    values.push((f.coerce ? f.coerce(v) : v) as string | number | null)
  }
  if (data.groupPrices !== undefined) { sets.push('group_prices = ?'); values.push(JSON.stringify(data.groupPrices)) }
  values.push(id)
  await db.runAsync(`UPDATE products SET ${sets.join(', ')} WHERE id = ?`, values)

  if (priceChanged) {
    const { logAudit } = await import('./db-audit')
    await logAudit(shopId, 'PRODUCT_PRICE_CHANGED', 'product', id, undefined, undefined,
      JSON.stringify({ sellingPrice: oldProduct?.sellingPrice, costPrice: oldProduct?.costPrice }),
      JSON.stringify({ sellingPrice: data.sellingPrice, costPrice: data.costPrice }))
  }
  await queueSync('products', 'update', id)
  enqueueProductUpdateSyncEvent(id)
    .then(() => triggerSync())
    .catch(() => { /* swallow — local DB is source of truth */ })
  return (await getProductById(id))!
}

async function enqueueProductUpdateSyncEvent(productId: string): Promise<void> {
  const db = await getDb()
  const row = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM products WHERE id = ?', [productId],
  )
  if (!row) return
  const businessId = await getCurrentShopId()
  if (!businessId) return
  const entity = fromLocalProduct(row)
  await defaultSyncEngine.enqueue({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    id: generateId() as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    idempotencyKey: ((entity as { idempotencyKey?: string }).idempotencyKey ?? productId) as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    businessId: String(entity.businessId) as any,
    entityKind: 'product',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    entityId: String(entity.id) as any,
    operation: 'update',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    originatingDeviceId: String(entity.businessId) as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    originatingEmployeeId: 'system' as any,
    clientSequence: Date.now(),
    clientCreatedAt: entity.updatedAt,
    entityVersion: entity.version,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload: entity as any,
    state: 'pending',
  })
}

export async function deleteProduct(id: string): Promise<void> {
  await enforceSubscriptionOrThrow()
  await enforcePermission(await getCurrentRole(), PERMISSIONS.PRODUCT_DELETE)
  const db = await getDb()
  await db.runAsync('UPDATE products SET is_active = 0, updated_at = ? WHERE id = ?', [new Date().toISOString(), id])
  await queueSync('products', 'delete', id)
  enqueueProductDeleteSyncEvent(id)
    .then(() => triggerSync())
    .catch(() => { /* swallow — local DB is source of truth */ })
}

async function enqueueProductDeleteSyncEvent(productId: string): Promise<void> {
  const businessId = await getCurrentShopId()
  if (!businessId) return
  await defaultSyncEngine.enqueue({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    id: generateId() as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    idempotencyKey: productId as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    businessId: businessId as any,
    entityKind: 'product',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    entityId: productId as any,
    operation: 'delete',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    originatingDeviceId: businessId as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    originatingEmployeeId: 'system' as any,
    clientSequence: Date.now(),
    clientCreatedAt: new Date().toISOString(),
    entityVersion: 1,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload: { id: productId } as any,
    state: 'pending',
  })
}
