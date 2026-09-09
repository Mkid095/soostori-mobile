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
