// db-schema-migrations.ts — ALTER TABLE migrations for existing installs
// Safe-column pattern: try ADD COLUMN, ignore if already exists

import type * as SQLite from 'expo-sqlite'

export async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  await migrateAddColumn(db, 'shop_settings', 'enabled_payment_channels', 'TEXT')
  await migrateAddColumn(db, 'shop_settings', 'biometric_enabled', 'INTEGER DEFAULT 0')
  // Sales table needs shop_id, employee_id, device_id for multi-terminal sync
  await migrateAddColumn(db, 'sales', 'shop_id', 'TEXT')
  await migrateAddColumn(db, 'sales', 'employee_id', 'TEXT')
  await migrateAddColumn(db, 'sales', 'device_id', 'TEXT')
  // Products needs current_stock as canonical stock cache
  // (inventory_transactions is the source of truth)
  await migrateAddColumn(db, 'products', 'current_stock', 'INTEGER DEFAULT 0')
  // Sync queue needs shop_id column for tenant scoping on cloud upload
  await migrateAddColumn(db, 'sync_queue', 'shop_id', 'TEXT')
  // Audit log needs SDK envelope columns for @soostori/audit bridge
  await migrateAddColumn(db, 'audit_logs', 'event_id', 'TEXT')
  await migrateAddColumn(db, 'audit_logs', 'event_name', 'TEXT')
  await migrateAddColumn(db, 'audit_logs', 'actor_type', "TEXT DEFAULT 'system'")
  await migrateAddColumn(db, 'audit_logs', 'shop_id', 'TEXT')
  // Inventory transactions need variant_id for variant-level stock tracking
  await migrateAddColumn(db, 'inventory_transactions', 'variant_id', 'TEXT')
  // Phase 09 — idempotency_key on movements for ledger replay safety
  await migrateAddColumn(db, 'inventory_transactions', 'idempotency_key', 'TEXT')
  // Phase 09 — stock_balances table (canonical balance cache per product)
  await ensureStockBalancesTable(db)
  // Phase 09 — sale_items needs idempotency_key for line-level sync dedup
  await migrateAddColumn(db, 'sale_items', 'idempotency_key', 'TEXT')
  // Phase 09 — stock_reservations table for pending-sale stock holds
  await ensureStockReservationsTable(db)
  // Phase 10 — Sales
  // Phase 10 — refund_items table for refund audit trail
  await ensureRefundItemsTable(db)
  // Phase 11 — Debts: business_id + idempotency_key for cloud sync
  await migrateAddColumn(db, 'debts', 'business_id', 'TEXT')
  await migrateAddColumn(db, 'debts', 'idempotency_key', 'TEXT')
  // Phase 11 — DebtPayments: business_id + employee_id + idempotency_key for cloud sync
  await migrateAddColumn(db, 'debt_payments', 'business_id', 'TEXT')
  await migrateAddColumn(db, 'debt_payments', 'employee_id', 'TEXT')
  await migrateAddColumn(db, 'debt_payments', 'idempotency_key', 'TEXT')
}

async function ensureStockReservationsTable(db: SQLite.SQLiteDatabase): Promise<void> {
  try {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS stock_reservations (
        id          TEXT PRIMARY KEY,
        sale_id     TEXT NOT NULL,
        product_id  TEXT NOT NULL,
        quantity    INTEGER NOT NULL,
        status      TEXT NOT NULL DEFAULT 'active',
        expires_at  TEXT NOT NULL,
        created_at  TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `)
  } catch {
    // Already exists
  }
}

async function ensureStockBalancesTable(db: SQLite.SQLiteDatabase): Promise<void> {
  try {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS stock_balances (
        product_id    TEXT PRIMARY KEY,
        shop_id       TEXT NOT NULL,
        quantity      INTEGER NOT NULL DEFAULT 0,
        reserved      INTEGER NOT NULL DEFAULT 0,
        last_seq      INTEGER NOT NULL DEFAULT 0,
        updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `)
  } catch {
    // Already exists
  }
}

async function ensureRefundItemsTable(db: SQLite.SQLiteDatabase): Promise<void> {
  try {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS refund_items (
        id              TEXT PRIMARY KEY,
        refund_id       TEXT NOT NULL,
        sale_id         TEXT NOT NULL,
        product_id      TEXT,
        product_name    TEXT NOT NULL,
        quantity        INTEGER NOT NULL,
        unit_price      REAL NOT NULL,
        refund_amount   REAL NOT NULL,
        idempotency_key TEXT,
        created_at      TEXT DEFAULT (datetime('now'))
      )
    `)
  } catch {
    // Already exists
  }
}

export async function migrateAddColumn(
  db: SQLite.SQLiteDatabase,
  table: string,
  column: string,
  type: string,
): Promise<void> {
  try {
    await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`)
  } catch {
    // Column already exists — ignore
  }
}
