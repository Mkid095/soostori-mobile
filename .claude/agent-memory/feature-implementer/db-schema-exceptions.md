---
name: db-schema-exceptions
description: db-schema.ts is the schema migration file and is exempted from the 150-line ANPAS limit.
metadata:
  type: project
---

`src/lib/db-schema.ts` is ~380 lines (vs the 150-line rule) but is explicitly exempted as a migrations file per `.ai/coding-rules.md` §2.

**Why:** ANPAS rules exempt "generated files, migrations, config files, test files" from the 150-line limit. `db-schema.ts` holds all CREATE TABLE statements + ALTER TABLE migrations for the SQLite schema.

**How to apply:** Don't split `db-schema.ts` into multiple files just to satisfy the 150-line limit. When adding new tables or columns, add them in `initSchema()` for fresh installs AND use the `migrateAddColumn()` helper at the bottom for existing installs. The helper silently swallows "duplicate column" errors so it's safe to call repeatedly.
