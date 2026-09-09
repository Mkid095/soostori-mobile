// Seed expense categories — called after initSchema completes.

import type * as SQLite from 'expo-sqlite'

export async function seedExpenseCategories(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    INSERT OR IGNORE INTO expense_categories (id, name, color, icon) VALUES
      ('cat-utilities', 'Utilities', '#3B82F6', 'zap'),
      ('cat-rent', 'Rent', '#8B5CF6', 'home'),
      ('cat-transport', 'Transport', '#F59E0B', 'truck'),
      ('cat-stock', 'Stock / Supplies', '#10B981', 'package'),
      ('cat-maintenance', 'Maintenance', '#EF4444', 'wrench'),
      ('cat-other', 'Other', '#6B7280', 'receipt')
  `)
}
