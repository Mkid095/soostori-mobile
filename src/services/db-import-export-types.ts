// db-import-export-types.ts — Shared types for CSV import/export
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
