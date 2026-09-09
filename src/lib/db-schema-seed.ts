// db-schema-seed.ts — Seed data for initial database setup

import type * as SQLite from 'expo-sqlite'

export async function seedDatabase(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`INSERT OR IGNORE INTO shop_settings (id) VALUES ('default')`)
}
