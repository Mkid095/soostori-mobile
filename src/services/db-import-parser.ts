// db-import-parser.ts — CSV parsing for product import
import type { CsvProductRow } from './db-import-export-types'

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

export function parseCsvLine(line: string): string[] {
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
