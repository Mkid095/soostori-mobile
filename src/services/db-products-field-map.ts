// db-products-field-map.ts — Product field mapping for updates
import type { Product } from '../lib/types'

export const FIELD_MAP: { js: keyof Product; col: string; coerce?: (v: unknown) => number }[] = [
  { js: 'name', col: 'name' },
  { js: 'categoryId', col: 'category_id' },
  { js: 'categoryName', col: 'category_name' },
  { js: 'categoryColor', col: 'category_color' },
  { js: 'sku', col: 'sku' },
  { js: 'barcode', col: 'barcode' },
  { js: 'imageUrl', col: 'image_url' },
  { js: 'costPrice', col: 'cost_price' },
  { js: 'sellingPrice', col: 'selling_price' },
  { js: 'discountPrice', col: 'discount_price' },
  { js: 'unit', col: 'unit' },
  { js: 'stockQuantity', col: 'stock_quantity' },
  { js: 'lowStockThreshold', col: 'low_stock_threshold' },
  { js: 'trackInventory', col: 'track_inventory', coerce: (v) => (v ? 1 : 0) },
  { js: 'allowSingleUnitSale', col: 'allow_single_unit_sale', coerce: (v) => (v ? 1 : 0) },
  { js: 'distributorName', col: 'distributor_name' },
  { js: 'distributorPhone', col: 'distributor_phone' },
  { js: 'unitsPerPackage', col: 'units_per_package' },
  { js: 'boxBuyingPrice', col: 'box_buying_price' },
]
