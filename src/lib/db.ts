// expo-sqlite database initialization
// Same schema as soostori-desktop/electron/database/schema-pos.ts

import * as SQLite from 'expo-sqlite'
import { initSchema } from './db-schema'

let db: SQLite.SQLiteDatabase | null = null

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db
  db = await SQLite.openDatabaseAsync('soostori.db')
  await initSchema(db)
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
  `)
  await initSchema(database)
}
