// Product row mapper — converts DB rows to Product objects

import type { Product, GroupPrice } from '../lib/types'

export function mapProductRow(row: Record<string, unknown>): Product {
  return {
    id: String(row.id),
    categoryId: row.category_id ? String(row.category_id) : undefined,
    categoryName: row.category_name ? String(row.category_name) : undefined,
    categoryColor: row.category_color ? String(row.category_color) : undefined,
    name: String(row.name),
    sku: row.sku ? String(row.sku) : undefined,
    barcode: row.barcode ? String(row.barcode) : undefined,
    imageUrl: row.image_url ? String(row.image_url) : undefined,
    costPrice: Number(row.cost_price) || 0,
    sellingPrice: Number(row.selling_price) || 0,
    discountPrice: row.discount_price ? Number(row.discount_price) : undefined,
    unit: String(row.unit || 'unit'),
    stockQuantity: Number(row.stock_quantity) || 0,
    lowStockThreshold: Number(row.low_stock_threshold) || 0,
    trackInventory: Boolean(row.track_inventory),
    allowSingleUnitSale: Boolean(row.allow_single_unit_sale),
    distributorName: row.distributor_name ? String(row.distributor_name) : undefined,
    distributorPhone: row.distributor_phone ? String(row.distributor_phone) : undefined,
    unitsPerPackage: row.units_per_package ? Number(row.units_per_package) : undefined,
    boxBuyingPrice: row.box_buying_price ? Number(row.box_buying_price) : undefined,
    groupPrices: row.group_prices ? JSON.parse(String(row.group_prices)) as GroupPrice[] : undefined,
    isActive: Boolean(row.is_active),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}
