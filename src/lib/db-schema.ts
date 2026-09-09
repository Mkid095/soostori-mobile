// db-schema.ts — Re-export barrel for all schema modules
// Split into: db-schema-core.ts (CREATE TABLE), db-schema-migrations.ts (ALTER TABLE),
// db-schema-seed.ts (seed data)

export { initSchema } from './db-schema-core'
export { runMigrations, migrateAddColumn } from './db-schema-migrations'
export { seedDatabase } from './db-schema-seed'
