// expo-sqlite database initialization
// Same schema as soostori-desktop/electron/database/schema-pos.ts

import * as SQLite from 'expo-sqlite'
import { initSchema } from './db-schema'
import { seedExpenseCategories } from './db-expense-seed'
import { generateId } from './formatters'

const DEFAULT_SHOP_ID = 'shop-default'

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

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db
  db = await SQLite.openDatabaseAsync('soostori.db')
  await initSchema(db)
  await seedExpenseCategories(db)
  // Migration: add new columns if they don't exist (safe to call on every launch)
  await addColumnIfNotExists(db, 'shop_settings', 'bank_paybill_number', 'TEXT')
  await addColumnIfNotExists(db, 'shop_settings', 'bank_paybill_account', 'TEXT')
  await addColumnIfNotExists(db, 'shop_settings', 'mpesa_pochi_phone', 'TEXT')
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
  `)
  await initSchema(database)
  await seedExpenseCategories(database)
}
