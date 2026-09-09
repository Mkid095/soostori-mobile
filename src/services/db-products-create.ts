// db-products-create.ts — Product creation logic
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getDb } from '../lib/db'
import type { Product } from '../lib/types'
import { generateId } from '../lib/formatters'
import { queueSync } from './sync-queue-helper'
import { getProductById } from './db-products-queries'
import { enforcePermission, PERMISSIONS } from './sdk-bridge/rbac'
import { enforceSubscriptionOrThrow } from './sdk-bridge/subscription-gate'
import { getCurrentRole } from './session-helper'

export async function createProduct(data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
  await enforceSubscriptionOrThrow()
  await enforcePermission(await getCurrentRole(), PERMISSIONS.INVENTORY_EDIT)
  const db = await getDb()
  const id = generateId()
  const now = new Date().toISOString()
  const groupPrices = data.groupPrices ? JSON.stringify(data.groupPrices) : null
  const cols = 'id, category_id, category_name, category_color, name, sku, barcode, image_url, cost_price, selling_price, discount_price, unit, stock_quantity, low_stock_threshold, track_inventory, allow_single_unit_sale, distributor_name, distributor_phone, units_per_package, box_buying_price, group_prices, is_active, created_at, updated_at'
  const vals = '?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?'
  await db.runAsync(`INSERT INTO products (${cols}) VALUES (${vals})`, [
    id, data.categoryId || null, data.categoryName || null, data.categoryColor || null,
    data.name, data.sku || null, data.barcode || null, data.imageUrl || null,
    data.costPrice, data.sellingPrice, data.discountPrice || null, data.unit,
    data.stockQuantity, data.lowStockThreshold,
    data.trackInventory ? 1 : 0, data.allowSingleUnitSale ? 1 : 0,
    data.distributorName || null, data.distributorPhone || null,
    data.unitsPerPackage || null, data.boxBuyingPrice || null, groupPrices, now, now])
  await queueSync('products', 'create', id)
  return (await getProductById(id))!
}
