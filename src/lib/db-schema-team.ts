// db-schema-team.ts — Team/sync tables (desktop-agent)
import type * as SQLite from 'expo-sqlite'

export async function initTeamSchema(db: SQLite.SQLiteDatabase): Promise<void> {
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
      -- Phase 15: status + is_primary for canonical device management
      status TEXT NOT NULL DEFAULT 'pending',
      is_primary INTEGER DEFAULT 0,
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
      variant_id TEXT,
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

    CREATE INDEX IF NOT EXISTS idx_sync_events_shop_seq ON sync_events(shop_id, sequence_number);
    CREATE INDEX IF NOT EXISTS idx_sync_events_device ON sync_events(device_id);
    CREATE INDEX IF NOT EXISTS idx_invitations_code ON invitations(code);
    CREATE INDEX IF NOT EXISTS idx_device_pairings_shop ON device_pairings(shop_id, status);
    CREATE INDEX IF NOT EXISTS idx_inventory_transactions_product ON inventory_transactions(product_id, timestamp);

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

    CREATE INDEX IF NOT EXISTS idx_sync_conflicts_shop ON sync_conflicts(shop_id, status);

    CREATE TABLE IF NOT EXISTS update_state (
      id TEXT PRIMARY KEY DEFAULT 'default',
      last_checked_at TEXT,
      downloaded_version TEXT,
      update_type TEXT,
      is_runtime_compatible INTEGER DEFAULT 1,
      downloaded_at TEXT
    );

    -- Phase 14: Team management
    CREATE TABLE IF NOT EXISTS team_invitations (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      invited_by_employee_id TEXT NOT NULL,
      email TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'attendant',
      status TEXT NOT NULL DEFAULT 'pending',
      expires_at TEXT NOT NULL,
      accepted_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS team_memberships (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      person_id TEXT,
      employee_id TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'attendant',
      permissions_json TEXT,
      joined_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_team_invitations_business ON team_invitations(business_id, status);
    CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON team_invitations(email);
    CREATE INDEX IF NOT EXISTS idx_team_memberships_business ON team_memberships(business_id);
    CREATE INDEX IF NOT EXISTS idx_team_memberships_employee ON team_memberships(employee_id);
  `)
}
