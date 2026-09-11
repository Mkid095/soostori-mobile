// inventory-mobile.ts — Phase 09: Inventory summary + stock movements for mobile
import { getDb } from '../lib/db'
import type { StockMovement } from '@soostori/contracts'
import { fromLocalStockMovement } from '../lib/contracts-mapper'

export interface InventorySummary {
  totalProducts: number
  totalValue: number
  lowStockCount: number
  lowStockProducts: Array<{
    id: string
    name: string
    stockQuantity: number
    threshold: number
    sellingPrice: number
  }>
}

export async function getInventorySummary(): Promise<InventorySummary> {
  const db = await getDb()

  const [productRows, lowStockRows] = await Promise.all([
    db.getAllAsync<Record<string, unknown>>(
      `SELECT COUNT(*) as total, COALESCE(SUM(current_stock * cost_price), 0) as value
       FROM products WHERE is_active = 1 AND track_inventory = 1`
    ),
    db.getAllAsync<Record<string, unknown>>(
      `SELECT id, name, stock_quantity, low_stock_threshold, selling_price
       FROM products
       WHERE is_active = 1 AND track_inventory = 1 AND low_stock_threshold > 0
         AND stock_quantity <= low_stock_threshold
       ORDER BY stock_quantity ASC`
    ),
  ])

  const totalProducts = Number(productRows[0]?.total ?? 0)
  const totalValue = Number(productRows[0]?.value ?? 0)
  const lowStockProducts = lowStockRows.map((r) => ({
    id: String(r.id),
    name: String(r.name ?? ''),
    stockQuantity: Number(r.stock_quantity ?? 0),
    threshold: Number(r.low_stock_threshold ?? 0),
    sellingPrice: Number(r.selling_price ?? 0),
  }))

  return {
    totalProducts,
    totalValue,
    lowStockCount: lowStockProducts.length,
    lowStockProducts,
  }
}

export async function getRecentStockMovements(limit = 20): Promise<StockMovement[]> {
  const db = await getDb()
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM inventory_transactions ORDER BY timestamp DESC`
  )
  return rows.slice(0, limit).map((r) => fromLocalStockMovement(r as Record<string, unknown>))
}
