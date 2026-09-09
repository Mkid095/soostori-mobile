// db-import-reconciliation.ts — Product reconciliation logic
import { getDb } from '../lib/db'
import type { CsvProductRow } from './db-import-export-types'
import type { ParsedRow } from './db-import-export-types'

export interface ReconciliationResult {
  rows: ParsedRow[]
  newCount: number
  duplicateCount: number
  noBarcodeCount: number
  errors: string[]
}

export async function getProductIdByBarcode(barcode: string): Promise<string | null> {
  const db = await getDb()
  const row = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM products WHERE barcode = ? AND is_active = 1', [barcode])
  return row ? row.id : null
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
