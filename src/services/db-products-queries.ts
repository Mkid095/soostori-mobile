// db-products-queries.ts — Product read operations
import { getDb } from '../lib/db'
import type { Product } from '../lib/types'
import { mapProductRow } from './db-products-mapper'

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
