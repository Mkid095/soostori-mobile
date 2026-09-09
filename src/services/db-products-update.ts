// db-products-update.ts — Product update and delete logic
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getDb } from '../lib/db'
import type { Product } from '../lib/types'
import { getProductById } from './db-products-queries'
import { queueSync } from './sync-queue-helper'
import { enforcePermission, PERMISSIONS } from './sdk-bridge/rbac'
import { enforceSubscriptionOrThrow } from './sdk-bridge/subscription-gate'
import { getCurrentRole } from './session-helper'
import { FIELD_MAP } from './db-products-field-map'

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
  return (await getProductById(id))!
}

export async function deleteProduct(id: string): Promise<void> {
  await enforceSubscriptionOrThrow()
  await enforcePermission(await getCurrentRole(), PERMISSIONS.PRODUCT_DELETE)
  const db = await getDb()
  await db.runAsync('UPDATE products SET is_active = 0, updated_at = ? WHERE id = ?', [new Date().toISOString(), id])
  await queueSync('products', 'delete', id)
}
