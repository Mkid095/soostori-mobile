// expo-sqlite database initialization
// Same schema as soostori-desktop/electron/database/schema-pos.ts

import * as SQLite from 'expo-sqlite'
import { initSchema } from './db-schema'
import { seedExpenseCategories } from './db-expense-seed'
import { generateId } from './formatters'

const DEFAULT_SHOP_ID = 'shop-default'
const CURRENT_SCHEMA_VERSION = 2

let db: SQLite.SQLiteDatabase | null = null

async function addColumnIfNotExists(
  database: SQLite.SQLiteDatabase,
  table: string,
  column: string,
  type: string,
): Promise<void> {
  try {
    await database.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`)
  } catch (e) {
    // Column already exists — ignore
    if (String(e).includes('duplicate column')) return
    throw e
  }
}

async function getSchemaVersion(database: SQLite.SQLiteDatabase): Promise<number> {
  try {
    const row = await database.getFirstAsync<Record<string, unknown>>(
      `SELECT version FROM schema_versions ORDER BY version DESC LIMIT 1`
    )
    return row ? Number(row.version) : 0
  } catch {
    return 0
  }
}

async function setSchemaVersion(database: SQLite.SQLiteDatabase, version: number): Promise<void> {
  await database.runAsync(
    `INSERT INTO schema_versions (version) VALUES (?)`,
    [version]
  )
}

// Migrations: each runMigration call advances the schema version by 1
async function runMigrations(database: SQLite.SQLiteDatabase): Promise<void> {
  const currentVersion = await getSchemaVersion(database)

  if (currentVersion < 1) {
    // Version 1: add new payment columns to shop_settings
    await addColumnIfNotExists(database, 'shop_settings', 'bank_paybill_number', 'TEXT')
    await addColumnIfNotExists(database, 'shop_settings', 'bank_paybill_account', 'TEXT')
    await addColumnIfNotExists(database, 'shop_settings', 'mpesa_pochi_phone', 'TEXT')
    await setSchemaVersion(database, 1)
  }

  if (currentVersion < 2) {
    // Version 2: cloud identity columns + sync_state table
    await addColumnIfNotExists(database, 'devices', 'cloud_device_id', 'TEXT')
    await addColumnIfNotExists(database, 'devices', 'cloud_registered', 'INTEGER DEFAULT 0')
    await addColumnIfNotExists(database, 'devices', 'cloud_registered_at', 'TEXT')
    await addColumnIfNotExists(database, 'employees', 'cloud_employee_id', 'TEXT')
    await addColumnIfNotExists(database, 'employees', 'cloud_sync_status', "TEXT DEFAULT 'pending'")
    await addColumnIfNotExists(database, 'shops', 'cloud_shop_id', 'TEXT UNIQUE')
    await addColumnIfNotExists(database, 'shops', 'cloud_owner_id', 'TEXT')
    await addColumnIfNotExists(database, 'shops', 'is_cloud_shop', 'INTEGER DEFAULT 0')
    await database.runAsync(`INSERT OR IGNORE INTO sync_state (id, shop_id) VALUES ('default', 'shop-default')`)
    await setSchemaVersion(database, 2)
  }

  // Future migrations go here:
  // if (currentVersion < 3) { ... await setSchemaVersion(database, 3) }
}

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db
  db = await SQLite.openDatabaseAsync('soostori.db')
  await initSchema(db)
  await seedExpenseCategories(db)
  await runMigrations(db)
  // Seed default shop row (idempotent)
  await db.runAsync(
    `INSERT OR IGNORE INTO shops (id, name) VALUES (?, ?)`,
    [DEFAULT_SHOP_ID, 'My Shop']
  )
  return db
}

export async function resetDb(): Promise<void> {
  const database = await getDb()
  await database.execAsync(`
    DROP TABLE IF EXISTS products;
    DROP TABLE IF EXISTS categories;
    DROP TABLE IF EXISTS sales;
    DROP TABLE IF EXISTS sale_items;
    DROP TABLE IF EXISTS held_sales;
    DROP TABLE IF EXISTS stock_movements;
    DROP TABLE IF EXISTS customers;
    DROP TABLE IF EXISTS debts;
    DROP TABLE IF EXISTS debt_payments;
    DROP TABLE IF EXISTS sync_queue;
    DROP TABLE IF EXISTS app_settings;
    DROP TABLE IF EXISTS expense_categories;
    DROP TABLE IF EXISTS expenses;
    DROP TABLE IF EXISTS notifications;
    DROP TABLE IF EXISTS product_variants;
    DROP TABLE IF EXISTS shops;
    DROP TABLE IF EXISTS employees;
    DROP TABLE IF EXISTS invitations;
    DROP TABLE IF EXISTS devices;
    DROP TABLE IF EXISTS device_pairings;
    DROP TABLE IF EXISTS sync_events;
    DROP TABLE IF EXISTS inventory_transactions;
    DROP TABLE IF EXISTS audit_logs;
    DROP TABLE IF EXISTS sync_conflicts;
    DROP TABLE IF EXISTS schema_versions;
    DROP TABLE IF EXISTS sync_state;
  `)
  await initSchema(database)
  await seedExpenseCategories(database)
}
