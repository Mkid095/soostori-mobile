// Device recovery — restores shop state from cloud snapshot
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getDb } from '../lib/db'

const DEVICE_ID_KEY = '@soostori:deviceId'
const CLOUD_DEVICE_ID_KEY = '@soostori:cloudDeviceId'
const CLOUD_TOKEN_KEY = '@soostori:cloudToken'
const EMPLOYEE_ID_KEY = '@soostori:employeeId'
const EMPLOYEE_ROLE_KEY = '@soostori:employeeRole'

export async function exportLocalSnapshot(): Promise<Record<string, unknown>> {
  const db = await getDb()

  const tables = [
    'products', 'categories', 'sales', 'sale_items', 'held_sales',
    'stock_movements', 'customers', 'debts', 'debt_payments',
    'shop_settings', 'app_settings', 'expense_categories', 'expenses',
    'product_variants', 'notifications',
  ]

  const snapshot: Record<string, unknown> = {}
  for (const table of tables) {
    try {
      const rows = await db.getAllAsync<Record<string, unknown>>(`SELECT * FROM ${table}`)
      snapshot[table] = rows
    } catch {
      snapshot[table] = []
    }
  }
  return snapshot
}

export async function importCloudSnapshot(snapshot: Record<string, unknown>): Promise<void> {
  const db = await getDb()

  // Clear operational tables (keep schema, employees, devices)
  const dropTables = [
    'products', 'categories', 'sales', 'sale_items', 'held_sales',
    'stock_movements', 'customers', 'debts', 'debt_payments',
    'expense_categories', 'expenses', 'product_variants',
    'notifications', 'sync_queue', 'sync_events', 'inventory_transactions',
    'audit_logs', 'sync_conflicts',
  ]
  for (const table of dropTables) {
    try { await db.runAsync(`DELETE FROM ${table}`) } catch { /* ignore */ }
  }

  // Restore from snapshot
  for (const [table, rows] of Object.entries(snapshot)) {
    if (!Array.isArray(rows)) continue
    for (const row of rows) {
      const cols = Object.keys(row).filter((k) => k !== 'rowid')
      if (cols.length === 0) continue
      const placeholders = cols.map(() => '?').join(',')
      const values = cols.map((c) => row[c] ?? null)
      try {
        await db.runAsync(`INSERT OR REPLACE INTO ${table} (${cols.join(',')}) VALUES (${placeholders})`, values)
      } catch { /* skip rows with schema mismatch */ }
    }
  }
}

export async function isNewDevice(): Promise<boolean> {
  const cloudRegistered = await AsyncStorage.getItem(CLOUD_DEVICE_ID_KEY)
  return !cloudRegistered
}

export async function clearDeviceIdentity(): Promise<void> {
  await AsyncStorage.multiRemove([
    DEVICE_ID_KEY,
    CLOUD_DEVICE_ID_KEY,
    CLOUD_TOKEN_KEY,
    EMPLOYEE_ID_KEY,
    EMPLOYEE_ROLE_KEY,
    '@soostori:serverIp',
    '@soostori:lastSequenceNumber',
  ])
}
