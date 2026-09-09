// Product CRUD operations — business logic in services, NOT components

import { getDb } from '../lib/db'
import type { Product } from '../lib/types'
import { generateId } from '../lib/formatters'
import { queueSync } from './sync-queue-helper'
import { mapProductRow } from './db-products-mapper'
import { recordInventoryTransaction } from './db-inventory-transactions'
import { logAudit } from './db-audit'

export async function getAllProducts(): Promise<Product[]> {
  const db = await getDb()
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM products WHERE is_active = 1 ORDER BY name ASC'
  )
  return rows.map(mapProductRow)
}

export async function getProductById(id: string): Promise<Product | null> {
  const db = await getDb()
  const row = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM products WHERE id = ?', [id]
  )
  return row ? mapProductRow(row) : null
}

export async function getProductByBarcode(barcode: string): Promise<Product | null> {
  const db = await getDb()
  const row = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM products WHERE barcode = ? AND is_active = 1', [barcode]
  )
  return row ? mapProductRow(row) : null
}

export async function searchProducts(query: string): Promise<Product[]> {
  const db = await getDb()
  const q = `%${query}%`
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM products
     WHERE is_active = 1
       AND (name LIKE ? OR barcode LIKE ? OR sku LIKE ?)
     ORDER BY name ASC`,
    [q, q, q]
  )
  return rows.map(mapProductRow)
}

export async function createProduct(data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
  const db = await getDb()
  const id = generateId()
  const now = new Date().toISOString()
  const groupPrices = data.groupPrices ? JSON.stringify(data.groupPrices) : null

  const cols = 'id, category_id, category_name, category_color, name, sku, barcode, image_url, cost_price, selling_price, discount_price, unit, stock_quantity, low_stock_threshold, track_inventory, allow_single_unit_sale, distributor_name, distributor_phone, units_per_package, box_buying_price, group_prices, is_active, created_at, updated_at'
  const placeholders = '?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?'
  const values = [
    id, data.categoryId || null, data.categoryName || null, data.categoryColor || null,
    data.name, data.sku || null, data.barcode || null, data.imageUrl || null,
    data.costPrice, data.sellingPrice, data.discountPrice || null, data.unit,
    data.stockQuantity, data.lowStockThreshold,
    data.trackInventory ? 1 : 0, data.allowSingleUnitSale ? 1 : 0,
    data.distributorName || null, data.distributorPhone || null,
    data.unitsPerPackage || null, data.boxBuyingPrice || null, groupPrices, now, now,
  ]

  await db.runAsync(`INSERT INTO products (${cols}) VALUES (${placeholders})`, values)
  await queueSync('products', 'create', id)
  return (await getProductById(id))!
}

const FIELD_MAP: { js: keyof Product; col: string; coerce?: (v: unknown) => number }[] = [
  { js: 'name', col: 'name' }, { js: 'categoryId', col: 'category_id' },
  { js: 'categoryName', col: 'category_name' }, { js: 'categoryColor', col: 'category_color' },
  { js: 'sku', col: 'sku' }, { js: 'barcode', col: 'barcode' },
  { js: 'imageUrl', col: 'image_url' }, { js: 'costPrice', col: 'cost_price' },
  { js: 'sellingPrice', col: 'selling_price' }, { js: 'discountPrice', col: 'discount_price' },
  { js: 'unit', col: 'unit' }, { js: 'stockQuantity', col: 'stock_quantity' },
  { js: 'lowStockThreshold', col: 'low_stock_threshold' },
  { js: 'trackInventory', col: 'track_inventory', coerce: (v) => (v ? 1 : 0) },
  { js: 'allowSingleUnitSale', col: 'allow_single_unit_sale', coerce: (v) => (v ? 1 : 0) },
  { js: 'distributorName', col: 'distributor_name' }, { js: 'distributorPhone', col: 'distributor_phone' },
  { js: 'unitsPerPackage', col: 'units_per_package' }, { js: 'boxBuyingPrice', col: 'box_buying_price' },
]

export async function updateProduct(id: string, data: Partial<Product>): Promise<Product> {
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
  if (data.groupPrices !== undefined) {
    sets.push('group_prices = ?')
    values.push(JSON.stringify(data.groupPrices))
  }

  values.push(id)
  await db.runAsync(`UPDATE products SET ${sets.join(', ')} WHERE id = ?`, values)

  if (priceChanged) {
    await logAudit(
      'default', 'PRODUCT_PRICE_CHANGED', 'product', id,
      undefined, undefined,
      JSON.stringify({ sellingPrice: oldProduct?.sellingPrice, costPrice: oldProduct?.costPrice }),
      JSON.stringify({ sellingPrice: data.sellingPrice, costPrice: data.costPrice }),
    )
  }

  await queueSync('products', 'update', id)
  return (await getProductById(id))!
}

export async function deleteProduct(id: string): Promise<void> {
  const db = await getDb()
  await db.runAsync('UPDATE products SET is_active = 0, updated_at = ? WHERE id = ?', [new Date().toISOString(), id])
  await queueSync('products', 'delete', id)
}

export async function getLowStockProducts(): Promise<Product[]> {
  const db = await getDb()
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM products
     WHERE is_active = 1
       AND track_inventory = 1
       AND low_stock_threshold > 0
       AND stock_quantity <= low_stock_threshold
     ORDER BY stock_quantity ASC`
  )
  return rows.map(mapProductRow)
}

export async function canSell(productId: string, quantity: number): Promise<{ ok: boolean; available: number }> {
  const db = await getDb()
  const row = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT current_stock FROM products WHERE id = ? AND is_active = 1', [productId]
  )
  const available = row ? Number(row.current_stock) || 0 : 0
  return { ok: available >= quantity, available }
}

export async function adjustStock(
  productId: string,
  quantity: number,
  reason: string,
  shopId?: string,
): Promise<void> {
  const prod = await getProductById(productId)
  const delta = quantity > 0 ? `+${quantity}` : `${quantity}`
  await logAudit(
    shopId ?? 'default',
    'STOCK_ADJUSTED',
    'product',
    productId,
    undefined,
    undefined,
    JSON.stringify({ stock: prod?.stockQuantity }),
    JSON.stringify({ stock: prod?.stockQuantity, delta }),
    reason,
  )
  await recordInventoryTransaction(
    shopId ?? 'default',
    productId,
    quantity > 0 ? 'PURCHASE' : 'ADJUSTMENT',
    Math.abs(quantity),
    undefined,
    undefined,
    undefined,
    undefined,
    reason,
  )
}
