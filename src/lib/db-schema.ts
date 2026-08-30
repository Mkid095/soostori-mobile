// SQLite schema — mirrors soostori-desktop/electron/database/schema-pos.ts

import type * as SQLite from 'expo-sqlite'

export async function initSchema(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      category_id TEXT,
      category_name TEXT,
      category_color TEXT,
      name TEXT NOT NULL,
      sku TEXT,
      barcode TEXT,
      image_url TEXT,
      cost_price REAL DEFAULT 0,
      selling_price REAL NOT NULL,
      discount_price REAL,
      unit TEXT DEFAULT 'unit',
      stock_quantity INTEGER DEFAULT 0,
      low_stock_threshold INTEGER DEFAULT 0,
      track_inventory INTEGER DEFAULT 1,
      allow_single_unit_sale INTEGER DEFAULT 1,
      distributor_name TEXT,
      distributor_phone TEXT,
      units_per_package INTEGER,
      box_buying_price REAL,
      group_prices TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT DEFAULT '#f97316',
      description TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      type TEXT DEFAULT 'retail',
      status TEXT DEFAULT 'completed',
      subtotal REAL NOT NULL,
      discount_amount REAL DEFAULT 0,
      total_amount REAL NOT NULL,
      paid_amount REAL DEFAULT 0,
      payment_method TEXT NOT NULL,
      note TEXT,
      customer_id_number TEXT,
      items TEXT,
      items_summary TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sale_items (
      id TEXT PRIMARY KEY,
      sale_id TEXT NOT NULL,
      product_id TEXT,
      variation_name TEXT,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      discount REAL DEFAULT 0,
      total_price REAL NOT NULL,
      FOREIGN KEY (sale_id) REFERENCES sales(id)
    );

    CREATE TABLE IF NOT EXISTS held_sales (
      id TEXT PRIMARY KEY,
      name TEXT,
      cart_items TEXT NOT NULL,
      payment_method TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS stock_movements (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      product_name TEXT,
      type TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      balance_after INTEGER NOT NULL,
      reason TEXT,
      reference_id TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      id_number TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS debts (
      id TEXT PRIMARY KEY,
      customer_id TEXT,
      customer_name TEXT,
      customer_phone TEXT,
      sale_id TEXT,
      amount REAL NOT NULL,
      amount_paid REAL DEFAULT 0,
      status TEXT DEFAULT 'pending',
      due_date TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS debt_payments (
      id TEXT PRIMARY KEY,
      debt_id TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_method TEXT NOT NULL,
      reference TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (debt_id) REFERENCES debts(id)
    );

    CREATE TABLE IF NOT EXISTS shop_settings (
      id TEXT PRIMARY KEY DEFAULT 'default',
      shop_name TEXT DEFAULT 'My Shop',
      address TEXT,
      phone TEXT,
      currency TEXT DEFAULT 'KES',
      receipt_footer TEXT,
      receipt_prefix TEXT DEFAULT 'INV',
      low_stock_threshold INTEGER DEFAULT 10,
      mpesa_send_money_phone TEXT,
      mpesa_paybill_number TEXT,
      mpesa_paybill_account TEXT,
      bank_paybill_number TEXT,
      bank_paybill_account TEXT,
      mpesa_pochi_phone TEXT,
      enabled_payment_channels TEXT,
      biometric_enabled INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY,
      table_name TEXT NOT NULL,
      action TEXT NOT NULL,
      payload TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at INTEGER NOT NULL,
      synced_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      id TEXT PRIMARY KEY DEFAULT 'default',
      default_theme TEXT DEFAULT 'light',
      default_language TEXT DEFAULT 'en',
      login_pin TEXT,
      pin_set INTEGER DEFAULT 0,
      last_login_date TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS product_variants (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      name TEXT NOT NULL,
      sku TEXT,
      barcode TEXT,
      cost_price REAL,
      selling_price REAL,
      stock_quantity INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (product_id) REFERENCES products(id)
    );
  `)

  // Seed default shop_settings row (idempotent — INSERT OR IGNORE)
  await db.execAsync(`INSERT OR IGNORE INTO shop_settings (id) VALUES ('default')`)

  // Migrate: add enabled_payment_channels column if it doesn't exist (existing installs)
  try {
    await db.execAsync(`ALTER TABLE shop_settings ADD COLUMN enabled_payment_channels TEXT`)
  } catch {
    // Column already exists — ignore
  }

  // Migrate: add biometric_enabled column if it doesn't exist (existing installs)
  try {
    await db.execAsync(`ALTER TABLE shop_settings ADD COLUMN biometric_enabled INTEGER DEFAULT 0`)
  } catch {
    // Column already exists — ignore
  }
}
