// db-backup.ts — Full database export/import matching soostori-desktop format
// Desktop schema: shopSettings, categories, products, customers, debts,
//                  sales, saleItems, heldSales, stockMovements

import { getDb } from '../lib/db'
import { APP_VERSION } from '../lib/constants'

export interface BackupData {
  exportedAt: string
  version: string
  shopSettings: Record<string, unknown> | null
  categories: Record<string, unknown>[]
  products: Record<string, unknown>[]
  customers: Record<string, unknown>[]
  debts: Record<string, unknown>[]
  sales: Record<string, unknown>[]
  saleItems: Record<string, unknown>[]
  heldSales: Record<string, unknown>[]
  stockMovements: Record<string, unknown>[]
}

export async function exportBackup(): Promise<BackupData> {
  const db = await getDb()
  const [shopSettings, categories, products, customers, debts, sales, saleItems, heldSales, stockMovements] =
    await Promise.all([
      db.getFirstAsync<Record<string, unknown>>('SELECT * FROM shop_settings WHERE id = ?', ['default']),
      db.getAllAsync<Record<string, unknown>>('SELECT * FROM categories'),
      db.getAllAsync<Record<string, unknown>>('SELECT * FROM products'),
      db.getAllAsync<Record<string, unknown>>('SELECT * FROM customers'),
      db.getAllAsync<Record<string, unknown>>('SELECT * FROM debts'),
      db.getAllAsync<Record<string, unknown>>('SELECT * FROM sales'),
      db.getAllAsync<Record<string, unknown>>('SELECT * FROM sale_items'),
      db.getAllAsync<Record<string, unknown>>('SELECT * FROM held_sales'),
      db.getAllAsync<Record<string, unknown>>('SELECT * FROM stock_movements'),
    ])
  return {
    exportedAt: new Date().toISOString(),
    version: APP_VERSION,
    shopSettings,
    categories,
    products,
    customers,
    debts,
    sales,
    saleItems,
    heldSales,
    stockMovements,
  }
}

async function importTable(db: Awaited<ReturnType<typeof getDb>>, table: string, rows: Record<string, unknown>[]) {
  if (!rows || rows.length === 0) return
  await db.execAsync(`DELETE FROM ${table}`)
  const cols = Object.keys(rows[0])
  for (const row of rows) {
    const placeholders = cols.map(() => '?').join(', ')
    const values: (string | number | null | Uint8Array)[] = cols.map(c => {
      const v = row[c]
      if (v === null || v === undefined) return null
      if (typeof v === 'string') return v
      if (typeof v === 'number') return v
      return String(v)
    })
    await db.runAsync(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`, values)
  }
}

export async function importBackup(data: BackupData): Promise<void> {
  const db = await getDb()

  await Promise.all([
    importTable(db, 'categories',      data.categories      || []),
    importTable(db, 'products',       data.products       || []),
    importTable(db, 'customers',       data.customers       || []),
    importTable(db, 'debts',          data.debts          || []),
    importTable(db, 'sales',          data.sales          || []),
    importTable(db, 'sale_items',     data.saleItems       || []),
    importTable(db, 'held_sales',     data.heldSales      || []),
    importTable(db, 'stock_movements', data.stockMovements || []),
  ])

  if (data.shopSettings) {
    const { id, ...settings } = data.shopSettings as { id: string; [key: string]: unknown }
    const fields = Object.keys(settings)
    const sets = fields.map(f => `${f} = ?`).join(', ')
    const values: (string | number | null | Uint8Array)[] = [
      ...fields.map(f => {
        const v = settings[f]
        if (v === null || v === undefined) return null
        if (typeof v === 'string') return v
        if (typeof v === 'number') return v
        return String(v)
      }),
      id,
    ]
    await db.runAsync(`UPDATE shop_settings SET ${sets} WHERE id = ?`, values)
  }
}
