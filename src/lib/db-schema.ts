// SQLite schema — ALL tables (base app + desktop-agent team/ sync)
// Mirrors soostori-desktop/electron/database/schema-pos.ts

import type * as SQLite from 'expo-sqlite'

export async function initSchema(db: SQLite.SQLiteDatabase): Promise<void> {
  // ── Base app tables ──────────────────────────────────────────────────────
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

    CREATE TABLE IF NOT EXISTS expense_categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT DEFAULT '#6B7280',
      icon TEXT DEFAULT 'receipt',
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      category_id TEXT,
      amount REAL NOT NULL,
      description TEXT,
      reference TEXT,
      date TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
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

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT,
      data TEXT,
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `)

  // ── Team / sync tables (desktop-agent) ──────────────────────────────────
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS shops (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      pin_hash TEXT NOT NULL,
      pin_salt TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'attendant',
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (shop_id) REFERENCES shops(id)
    );

    CREATE TABLE IF NOT EXISTS invitations (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL,
      employee_id TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (shop_id) REFERENCES shops(id),
      FOREIGN KEY (employee_id) REFERENCES employees(id)
    );

    CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL,
      employee_id TEXT,
      device_name TEXT,
      device_type TEXT NOT NULL DEFAULT 'mobile',
      is_host INTEGER DEFAULT 0,
      last_seen TEXT,
      capabilities TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (shop_id) REFERENCES shops(id)
    );

    CREATE TABLE IF NOT EXISTS device_pairings (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL,
      device_id TEXT NOT NULL,
      requested_by TEXT,
      approved_by TEXT,
      approved_at TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (shop_id) REFERENCES shops(id),
      FOREIGN KEY (device_id) REFERENCES devices(id)
    );

    CREATE TABLE IF NOT EXISTS sync_events (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL,
      device_id TEXT NOT NULL,
      sequence_number INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      payload TEXT NOT NULL,
      timestamp TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (shop_id) REFERENCES shops(id)
    );

    CREATE TABLE IF NOT EXISTS inventory_transactions (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      variant_name TEXT,
      type TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      balance_after INTEGER NOT NULL,
      created_by TEXT,
      device_id TEXT,
      reference_id TEXT,
      reason TEXT,
      timestamp TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (shop_id) REFERENCES shops(id)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL,
      employee_id TEXT,
      device_id TEXT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      old_value TEXT,
      new_value TEXT,
      reason TEXT,
      timestamp TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (shop_id) REFERENCES shops(id)
    );

    CREATE INDEX IF NOT EXISTS idx_sync_events_shop_seq
      ON sync_events(shop_id, sequence_number);
    CREATE INDEX IF NOT EXISTS idx_sync_events_device
      ON sync_events(device_id);
    CREATE INDEX IF NOT EXISTS idx_invitations_code
      ON invitations(code);
    CREATE INDEX IF NOT EXISTS idx_device_pairings_shop
      ON device_pairings(shop_id, status);
    CREATE INDEX IF NOT EXISTS idx_inventory_transactions_product
      ON inventory_transactions(product_id, timestamp);

    CREATE TABLE IF NOT EXISTS sync_conflicts (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL,
      sale_id TEXT NOT NULL,
      device_id TEXT NOT NULL,
      conflict_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      original_payload TEXT NOT NULL,
      resolution TEXT,
      resolved_by TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (shop_id) REFERENCES shops(id)
    );

    CREATE INDEX IF NOT EXISTS idx_sync_conflicts_shop
      ON sync_conflicts(shop_id, status);

    CREATE TABLE IF NOT EXISTS schema_versions (
      version INTEGER PRIMARY KEY,
      applied_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sync_state (
      id TEXT PRIMARY KEY DEFAULT 'default',
      shop_id TEXT NOT NULL,
      device_id TEXT,
      cloud_device_id TEXT,
      last_cloud_sync_at TEXT,
      last_sequence_number INTEGER DEFAULT 0,
      pending_upload_count INTEGER DEFAULT 0,
      cloud_entitlement_status TEXT,
      entitlement_verified_at TEXT,
      entitlement_expires_at TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `)

  // ── Seed rows ────────────────────────────────────────────────────────────
  await db.execAsync(`INSERT OR IGNORE INTO shop_settings (id) VALUES ('default')`)
  await db.execAsync(`INSERT OR IGNORE INTO sync_state (id, shop_id) VALUES ('default', 'shop-default')`)

  // ── Safe-column migrations (existing installs) ───────────────────────────
  await migrateAddColumn(db, 'shop_settings', 'enabled_payment_channels', 'TEXT')
  await migrateAddColumn(db, 'shop_settings', 'biometric_enabled', 'INTEGER DEFAULT 0')
  // Sales table needs shop_id, employee_id, device_id for multi-terminal sync
  await migrateAddColumn(db, 'sales', 'shop_id', 'TEXT')
  await migrateAddColumn(db, 'sales', 'employee_id', 'TEXT')
  await migrateAddColumn(db, 'sales', 'device_id', 'TEXT')
  // Products needs current_stock as canonical stock cache (inventory_transactions is the truth)
  await migrateAddColumn(db, 'products', 'current_stock', 'INTEGER DEFAULT 0')
}

async function migrateAddColumn(
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
