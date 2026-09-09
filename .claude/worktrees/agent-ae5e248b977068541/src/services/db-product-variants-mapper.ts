// Product variant row mapper — converts DB rows to ProductVariant objects

import type { ProductVariant } from '../lib/types'

export function mapVariantRow(row: Record<string, unknown>): ProductVariant {
  return {
    id: String(row.id),
    productId: String(row.product_id),
    name: String(row.name),
    sku: row.sku ? String(row.sku) : undefined,
    barcode: row.barcode ? String(row.barcode) : undefined,
    costPrice: row.cost_price != null ? Number(row.cost_price) : undefined,
    sellingPrice: row.selling_price != null ? Number(row.selling_price) : undefined,
    stockQuantity: Number(row.stock_quantity) || 0,
    isActive: Boolean(row.is_active),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}
