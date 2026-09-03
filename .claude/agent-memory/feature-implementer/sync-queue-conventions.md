---
name: sync-queue-conventions
description: How the soostori-mobile sync_queue table, processor, and retry helpers are structured — useful when touching cloud sync.
metadata:
  type: project
---

`sync_queue` schema (in `src/lib/db-schema.ts`) columns: `id`, `shop_id`, `table_name`, `action`, `payload`, `status`, `created_at`, `synced_at`, `retry_count`, `retry_at`. Status is `pending` / `synced` / `failed`.

**Why:** Phase 4 added retry columns (`retry_count`, `retry_at`) and Phase 3-4 added `shop_id` for tenant scoping on cloud upload.

**How to apply:** When inserting into `sync_queue`, always include `shop_id` (read from `@soostori:shopId` AsyncStorage key). Use `queueSync()` in `src/services/sync-queue-helper.ts` — it handles shopId resolution. For retries, use `markSyncEventRetryable(eventId)` which sets `retry_at` via backoff schedule `[60_000, 300_000, 900_000]` ms and marks `failed` after 3 attempts. `processSyncQueue()` in `sync-queue-processor.ts` runs every 60s, attempts upload regardless of grace window, and on 401 it clears `@soostori:entitlement` + `@soostori:verificationDeadline` then marks event failed.

Related: [[db-schema-exceptions]]
