// db-import-export.ts — CSV product import/export orchestration
import { getDb } from '../lib/db'
import type { Product } from '../lib/types'
import { generateId } from '../lib/formatters'
import { mapProductRow } from './db-products-mapper'
import { queueSync } from './sync-queue-helper'
import { parseProductCsv } from './db-import-parser'
import { exportProductsToCsv, productToCsvRow, rowToProductData } from './db-export-formatter'
import { buildReconciliation } from './db-import-reconciliation'
import type { CsvProductRow } from './db-import-export-types'
import type { ParsedRow } from './db-import-export-types'

export type { CsvProductRow, ParsedRow, ReconciliationResult } from './db-import-export-types'
export { productToCsvRow, exportProductsToCsv, rowToProductData }
export { parseProductCsv }

export async function getAllActiveProducts(): Promise<Product[]> {
  const db = await getDb()
  const rows = await db.getAllAsync<Record<string, unknown>>('SELECT * FROM products WHERE is_active = 1 ORDER BY name ASC')
  return rows.map(mapProductRow)
}

export async function getExistingBarcodes(barcodes: (string | undefined)[]): Promise<Set<string>> {
  const defined = barcodes.filter((b): b is string => Boolean(b))
  if (defined.length === 0) return new Set()
  const db = await getDb()
  const placeholders = defined.map(() => '?').join(', ')
  const rows = await db.getAllAsync<{ barcode: string }>(
    `SELECT barcode FROM products WHERE barcode IN (${placeholders}) AND is_active = 1`, defined)
  return new Set(rows.map(r => r.barcode))
}

export { buildReconciliation }

export async function importProductsBatch(
  rows: ParsedRow[],
  onProgress?: (current: number, total: number) => void
): Promise<{ created: number; updated: number; skipped: number }> {
  const db = await getDb()
  let created = 0, updated = 0, skipped = 0
  const toImport = rows.filter(r => r.status === 'NEW' || r.status === 'DUPLICATE')

  for (let i = 0; i < toImport.length; i++) {
    const item = toImport[i]
    onProgress?.(i + 1, toImport.length)
    try {
      if (item.status === 'NEW') {
        const data = rowToProductData(item.row)
        const id = generateId()
        const now = new Date().toISOString()
        await db.runAsync(
          `INSERT INTO products (id, category_name, name, sku, barcode, cost_price, selling_price, unit, stock_quantity, low_stock_threshold, track_inventory, allow_single_unit_sale, distributor_name, distributor_phone, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?, 1, ?, ?)`,
          [id, data.categoryName || null, data.name, data.sku || null, data.barcode || null,
           data.costPrice, data.sellingPrice, data.unit, data.stockQuantity, data.lowStockThreshold,
           data.distributorName || null, data.distributorPhone || null, now, now])
        await queueSync('products', 'create', id)
        created++
      } else if (item.status === 'DUPLICATE' && item.existingId) {
        const data = rowToProductData(item.row)
        const now = new Date().toISOString()
        await db.runAsync(
          `UPDATE products SET name = ?, sku = ?, category_name = ?, cost_price = ?, selling_price = ?, unit = ?, stock_quantity = ?, low_stock_threshold = ?, distributor_name = ?, distributor_phone = ?, updated_at = ? WHERE id = ?`,
          [data.name, data.sku || null, data.categoryName || null, data.costPrice, data.sellingPrice,
           data.unit, data.stockQuantity, data.lowStockThreshold,
           data.distributorName || null, data.distributorPhone || null, now, item.existingId])
        await queueSync('products', 'update', item.existingId)
        updated++
      }
    } catch { skipped++ }
  }
  skipped += rows.filter(r => r.status === 'NO_BARCODE').length
  return { created, updated, skipped }
}
