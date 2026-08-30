// Product variant CRUD operations — business logic in services, NOT components

import { getDb } from '../lib/db'
import type { ProductVariant } from '../lib/types'
import { generateId } from '../lib/formatters'
import { queueSync } from './sync-queue-helper'
import { mapVariantRow } from './db-product-variants-mapper'

export async function getVariantsByProductId(productId: string): Promise<ProductVariant[]> {
  const db = await getDb()
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM product_variants WHERE product_id = ? AND is_active = 1 ORDER BY name ASC',
    [productId]
  )
  return rows.map(mapVariantRow)
}

export async function getVariantById(id: string): Promise<ProductVariant | null> {
  const db = await getDb()
  const row = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM product_variants WHERE id = ?', [id]
  )
  return row ? mapVariantRow(row) : null
}

export async function createVariant(
  data: Omit<ProductVariant, 'id' | 'createdAt' | 'updatedAt'>
): Promise<ProductVariant> {
  const db = await getDb()
  const id = generateId()
  const now = new Date().toISOString()

  await db.runAsync(
    `INSERT INTO product_variants (id, product_id, name, sku, barcode, cost_price, selling_price, stock_quantity, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    [id, data.productId, data.name, data.sku || null, data.barcode || null,
     data.costPrice ?? null, data.sellingPrice ?? null, data.stockQuantity, now, now]
  )
  await queueSync('product_variants', 'create', id)
  return (await getVariantById(id))!
}

export async function updateVariant(id: string, data: Partial<ProductVariant>): Promise<ProductVariant> {
  const db = await getDb()
  const now = new Date().toISOString()
  const sets: string[] = ['updated_at = ?']
  const values: (string | number | null)[] = [now]

  if (data.name !== undefined) { sets.push('name = ?'); values.push(data.name) }
  if (data.sku !== undefined) { sets.push('sku = ?'); values.push(data.sku) }
  if (data.barcode !== undefined) { sets.push('barcode = ?'); values.push(data.barcode) }
  if (data.costPrice !== undefined) { sets.push('cost_price = ?'); values.push(data.costPrice) }
  if (data.sellingPrice !== undefined) { sets.push('selling_price = ?'); values.push(data.sellingPrice) }
  if (data.stockQuantity !== undefined) { sets.push('stock_quantity = ?'); values.push(data.stockQuantity) }

  values.push(id)
  await db.runAsync(`UPDATE product_variants SET ${sets.join(', ')} WHERE id = ?`, values)
  await queueSync('product_variants', 'update', id)
  return (await getVariantById(id))!
}

export async function deleteVariant(id: string): Promise<void> {
  const db = await getDb()
  await db.runAsync(
    'UPDATE product_variants SET is_active = 0, updated_at = ? WHERE id = ?',
    [new Date().toISOString(), id]
  )
  await queueSync('product_variants', 'delete', id)
}

export async function adjustVariantStock(
  variantId: string,
  quantity: number,
  reason: string
): Promise<void> {
  const db = await getDb()
  const variant = await getVariantById(variantId)
  if (!variant) return

  const newBalance = variant.stockQuantity + quantity
  const id = generateId()
  const now = new Date().toISOString()

  await db.runAsync(
    'INSERT INTO stock_movements (id, product_id, product_name, type, quantity, balance_after, reason, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [id, variant.productId, `Variant: ${variant.name}`, quantity > 0 ? 'purchase' : 'adjustment', quantity, newBalance, reason, now]
  )
  await db.runAsync(
    'UPDATE product_variants SET stock_quantity = ?, updated_at = ? WHERE id = ?',
    [newBalance, now, variantId]
  )
  await queueSync('stock_movements', 'create', id)
}

export async function getVariantsByProductIdWithStock(productId: string): Promise<ProductVariant[]> {
  const db = await getDb()
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM product_variants WHERE product_id = ? AND is_active = 1 AND stock_quantity > 0 ORDER BY name ASC',
    [productId]
  )
  return rows.map(mapVariantRow)
}
