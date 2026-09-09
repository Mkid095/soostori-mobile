// db-export-formatter.ts — CSV export formatting
import type { Product } from '../lib/types'
import type { CsvProductRow } from './db-import-export-types'

// CSV headers for export
const CSV_HEADERS = [
  'name', 'sku', 'barcode', 'category', 'cost_price', 'selling_price',
  'stock_quantity', 'low_stock_threshold', 'unit', 'distributor_name', 'distributor_phone',
]

export function productToCsvRow(p: Product): string {
  const fields = [
    p.name,
    p.sku ?? '',
    p.barcode ?? '',
    p.categoryName ?? '',
    String(p.costPrice),
    String(p.sellingPrice),
    String(p.stockQuantity),
    String(p.lowStockThreshold),
    p.unit,
    p.distributorName ?? '',
    p.distributorPhone ?? '',
  ]
  return fields.map(f => `"${String(f).replace(/"/g, '""')}"`).join(',')
}

export function exportProductsToCsv(products: Product[]): string {
  const header = CSV_HEADERS.join(',')
  const rows = products.map(productToCsvRow)
  return [header, ...rows].join('\n')
}

export function rowToProductData(row: CsvProductRow): Omit<Product, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    name: row.name,
    sku: row.sku,
    barcode: row.barcode,
    categoryName: row.category,
    costPrice: parseFloat(row.cost_price ?? '0') || 0,
    sellingPrice: parseFloat(row.selling_price ?? '0') || 0,
    stockQuantity: parseInt(row.stock_quantity ?? '0') || 0,
    lowStockThreshold: parseInt(row.low_stock_threshold ?? '0') || 0,
    unit: row.unit ?? 'unit',
    distributorName: row.distributor_name,
    distributorPhone: row.distributor_phone,
    trackInventory: true,
    allowSingleUnitSale: true,
    isActive: true,
  }
}
