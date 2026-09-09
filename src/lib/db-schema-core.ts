// db-schema-core.ts — Re-export barrel for schema modules
// Split into: db-schema-base.ts (base app tables), db-schema-team.ts (team/sync tables)

export { initBaseSchema } from './db-schema-base'
export { initTeamSchema } from './db-schema-team'

import type * as SQLite from 'expo-sqlite'

export async function initSchema(db: SQLite.SQLiteDatabase): Promise<void> {
  const { initBaseSchema } = await import('./db-schema-base')
  const { initTeamSchema } = await import('./db-schema-team')
  await initBaseSchema(db)
  await initTeamSchema(db)
}
