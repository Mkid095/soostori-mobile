// db-import-export.ts — CSV product import/export with reconciliation
import { getDb } from '../lib/db'
import type { Product } from '../lib/types'
import { generateId } from '../lib/formatters'
import { mapProductRow } from './db-products-mapper'
import { queueSync } from './sync-queue-helper'

export interface CsvProductRow {
  name: string
  sku?: string
  barcode?: string
  category?: string
  cost_price?: string
  selling_price?: string
  stock_quantity?: string
  low_stock_threshold?: string
  unit?: string
  distributor_name?: string
  distributor_phone?: string
}

export interface ParsedRow {
  row: CsvProductRow
  status: 'NEW' | 'DUPLICATE' | 'NO_BARCODE'
  existingId?: string
  line: number
}

export interface ReconciliationResult {
  rows: ParsedRow[]
  newCount: number
  duplicateCount: number
  noBarcodeCount: number
  errors: string[]
}

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

export async function getAllActiveProducts(): Promise<Product[]> {
  const db = await getDb()
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM products WHERE is_active = 1 ORDER BY name ASC'
  )
  return rows.map(mapProductRow)
}

export async function getExistingBarcodes(barcodes: (string | undefined)[]): Promise<Set<string>> {
  const defined = barcodes.filter((b): b is string => Boolean(b))
  if (defined.length === 0) return new Set()
  const db = await getDb()
  const placeholders = defined.map(() => '?').join(', ')
  const rows = await db.getAllAsync<{ barcode: string }>(
    `SELECT barcode FROM products WHERE barcode IN (${placeholders}) AND is_active = 1`,
    defined
  )
  return new Set(rows.map(r => r.barcode))
}

export async function getProductIdByBarcode(barcode: string): Promise<string | null> {
  const db = await getDb()
  const row = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM products WHERE barcode = ? AND is_active = 1', [barcode]
  )
  return row ? row.id : null
}

export function parseProductCsv(csvString: string): { rows: CsvProductRow[]; errors: string[] } {
  const lines = csvString.split('\n').filter(l => l.trim())
  if (lines.length < 2) return { rows: [], errors: ['CSV must have a header row and at least one data row'] }

  const header = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase())
  const rows: CsvProductRow[] = []
  const errors: string[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i])
    if (values.length !== header.length) {
      errors.push(`Line ${i + 1}: Column count mismatch (expected ${header.length}, got ${values.length})`)
      continue
    }
    const row: Record<string, string> = {}
    for (let j = 0; j < header.length; j++) {
      row[header[j]] = values[j]?.trim() ?? ''
    }
    if (!row.name) {
      errors.push(`Line ${i + 1}: Missing product name`)
      continue
    }
    rows.push({
      name: row.name,
      sku: row.sku || undefined,
      barcode: row.barcode || undefined,
      category: row.category || undefined,
      cost_price: row.cost_price || undefined,
      selling_price: row.selling_price || undefined,
      stock_quantity: row.stock_quantity || undefined,
      low_stock_threshold: row.low_stock_threshold || undefined,
      unit: row.unit || undefined,
      distributor_name: row.distributor_name || undefined,
      distributor_phone: row.distributor_phone || undefined,
    })
  }
  return { rows, errors }
}

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  result.push(current)
  return result
}

export async function buildReconciliation(rows: CsvProductRow[]): Promise<ReconciliationResult> {
  const errors: string[] = []
  const parsedRows: ParsedRow[] = []
  const newRows: string[] = []
  const dupRows: string[] = []

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    if (!r.barcode) {
      parsedRows.push({ row: r, status: 'NO_BARCODE', line: i + 2 })
      continue
    }
    const existingId = await getProductIdByBarcode(r.barcode)
    if (existingId) {
      parsedRows.push({ row: r, status: 'DUPLICATE', existingId, line: i + 2 })
      dupRows.push(r.barcode)
    } else {
      parsedRows.push({ row: r, status: 'NEW', line: i + 2 })
      newRows.push(r.barcode)
    }
  }

  return {
    rows: parsedRows,
    newCount: newRows.length,
    duplicateCount: dupRows.length,
    noBarcodeCount: parsedRows.filter(r => r.status === 'NO_BARCODE').length,
    errors,
  }
}

function rowToProductData(row: CsvProductRow): Omit<Product, 'id' | 'createdAt' | 'updatedAt'> {
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

export async function importProductsBatch(
  rows: ParsedRow[],
  onProgress?: (current: number, total: number) => void
): Promise<{ created: number; updated: number; skipped: number }> {
  const db = await getDb()
  let created = 0
  let updated = 0
  let skipped = 0
  const toImport = rows.filter(r => r.status === 'NEW' || r.status === 'DUPLICATE')

  for (let i = 0; i < toImport.length; i++) {
    const item = toImport[i]
    onProgress?.(i + 1, toImport.length)
    try {
      if (item.status === 'NEW') {
        const data = rowToProductData(item.row)
        const id = generateId()
        const now = new Date().toISOString()
        const cols = 'id, category_name, name, sku, barcode, cost_price, selling_price, unit, stock_quantity, low_stock_threshold, track_inventory, allow_single_unit_sale, distributor_name, distributor_phone, is_active, created_at, updated_at'
        const vals = '?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?, 1, ?, ?'
        await db.runAsync(
          `INSERT INTO products (${cols}) VALUES (${vals})`,
          [id, data.categoryName || null, data.name, data.sku || null, data.barcode || null,
           data.costPrice, data.sellingPrice, data.unit, data.stockQuantity, data.lowStockThreshold,
           data.distributorName || null, data.distributorPhone || null, now, now]
        )
        await queueSync('products', 'create', id)
        created++
      } else if (item.status === 'DUPLICATE' && item.existingId) {
        const data = rowToProductData(item.row)
        const now = new Date().toISOString()
        await db.runAsync(
          `UPDATE products SET name = ?, sku = ?, category_name = ?, cost_price = ?, selling_price = ?,
           unit = ?, stock_quantity = ?, low_stock_threshold = ?, distributor_name = ?,
           distributor_phone = ?, updated_at = ? WHERE id = ?`,
          [data.name, data.sku || null, data.categoryName || null, data.costPrice, data.sellingPrice,
           data.unit, data.stockQuantity, data.lowStockThreshold,
           data.distributorName || null, data.distributorPhone || null, now, item.existingId]
        )
        await queueSync('products', 'update', item.existingId)
        updated++
      }
    } catch {
      skipped++
    }
  }

  skipped += rows.filter(r => r.status === 'NO_BARCODE').length
  return { created, updated, skipped }
}
