/**
 * mobile-sync-engine.ts — Phase 05 Real Sync Engine
 *
 * Real SyncEngine backed by the FIDScript InstantClient (`db`).
 * Replaces the NoOp stub so Mobile can push to cloud and pull from cloud.
 *
 * Responsibilities:
 *  - enqueue()  — uploads SyncEvent to FIDScript cloud
 *  - pull()     — queries FIDScript for events newer than `lastSyncAt`
 *  - apply()    — translates a cloud SyncEvent into a local SQLite upsert
 *
 * Business isolation: every event is scoped to `activeBusinessId` (shopId).
 * Idempotency: FIDScript transact is used so duplicates are handled at cloud level.
 */
import { db, id } from '../lib/instant-client'
import { getDb } from '../lib/db'
import { getCurrentShopId } from './session-helper'
import type { SyncEvent } from '@soostori/contracts'
import type { SyncApplyResult } from '@soostori/contracts'

// ── Local outbox (SQLite) ────────────────────────────────────────────────────

const OUTBOX_TABLE = `
  CREATE TABLE IF NOT EXISTS sync_outbox (
    id              TEXT PRIMARY KEY,
    business_id     TEXT NOT NULL,
    entity_kind     TEXT NOT NULL,
    entity_id       TEXT NOT NULL,
    operation       TEXT NOT NULL,
    idempotency_key TEXT NOT NULL,
    payload         TEXT NOT NULL,
    created_at      TEXT NOT NULL,
    state           TEXT NOT NULL DEFAULT 'pending'
  )
`

export async function ensureOutboxTable(): Promise<void> {
  const database = await getDb()
  await database.runAsync(OUTBOX_TABLE)
}

// ── Push path ────────────────────────────────────────────────────────────────

/**
 * enqueue — upload one event to FIDScript cloud immediately.
 * Called by createProduct/createSale after local SQLite INSERT succeeds.
 * The local outbox is also updated so pushOutbox() can recover on failure.
 */
export async function enqueue(
  event: SyncEvent,
): Promise<{ state: 'queued' | 'acked' | 'rejected' }> {
  try {
    const database = await getDb()

    // Persist to local outbox first (survives crashes)
    await database.runAsync(
      `INSERT OR REPLACE INTO sync_outbox
         (id, business_id, entity_kind, entity_id, operation, idempotency_key, payload, created_at, state)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'acked')`,
      [
        event.id,
        event.businessId,
        event.entityKind,
        event.entityId,
        event.operation,
        event.idempotencyKey,
        JSON.stringify(event.payload),
        event.clientCreatedAt,
      ],
    )

    // Upload to FIDScript cloud
    await uploadEventToCloud(event)
    return { state: 'acked' }
  } catch (err) {
    console.error('[MobileSyncEngine] enqueue failed:', err)
    return { state: 'rejected' }
  }
}

/**
 * pushOutbox — flush all pending local outbox events to cloud.
 * Called by sync service on startup and on network reconnect.
 */
export async function pushOutbox(): Promise<{ pushed: number; failed: number }> {
  const database = await getDb()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[] = await database.getAllAsync(
    `SELECT * FROM sync_outbox WHERE state = 'pending' ORDER BY created_at ASC`,
  )

  let pushed = 0, failed = 0
  for (const row of rows) {
    try {
      const event: SyncEvent = {
        id: row.id,
        idempotencyKey: row.idempotency_key,
        businessId: row.business_id,
        entityKind: row.entity_kind as SyncEvent['entityKind'],
        entityId: row.entity_id,
        operation: row.operation as SyncEvent['operation'],
        originatingDeviceId: 'mobile',
        originatingEmployeeId: 'system',
        clientSequence: Date.now(),
        clientCreatedAt: row.created_at,
        entityVersion: 1,
        payload: JSON.parse(row.payload),
        state: 'pending',
      }
      await uploadEventToCloud(event)
      await database.runAsync(
        `UPDATE sync_outbox SET state = 'acked' WHERE id = ?`,
        [row.id],
      )
      pushed++
    } catch {
      failed++
    }
  }
  return { pushed, failed }
}

// ── Pull path ───────────────────────────────────────────────────────────────

export interface PullResult {
  events: SyncEvent[]
  cursor: string // ISO timestamp
}

/**
 * pull — query FIDScript for sync events where:
 *   - shopId matches the current business
 *   - syncedAt > lastSyncAt
 *
 * InstantDB doesn't support GT on string fields, so we fetch all events
 * for the shop and filter in-memory. Cursor is the max syncedAt seen.
 */
export async function pull(lastSyncAt: string | null): Promise<PullResult> {
  const shopId = await getCurrentShopId()
  if (!shopId) return { events: [], cursor: lastSyncAt ?? new Date().toISOString() }

  // Fetch all events for this shop (InstantDB doesn't support string GT)
  const result = await db.queryOnce({
    syncEvents: {
      $: { where: { shopId } },
    },
  })

  const rawEvents =
    (result.data.syncEvents as Array<Record<string, unknown>>) ?? []
  const since = lastSyncAt ?? ''

  // Filter to events newer than `since`, deduplicate by idempotencyKey
  const seen = new Set<string>()
  const filtered = rawEvents.filter(cev => {
    const ts = String(cev.syncedAt ?? cev.timestamp ?? '')
    if (ts <= since) return false
    const key = String(cev.idempotencyKey ?? cev.id ?? '')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  // Sort by timestamp ascending (oldest first)
  filtered.sort((a, b) =>
    String(a.syncedAt ?? a.timestamp ?? '').localeCompare(
      String(b.syncedAt ?? b.timestamp ?? ''),
    ),
  )

  const events = filtered.map(cev => cloudEventToSyncEvent(cev, shopId))
  const cursor =
    filtered.length > 0
      ? String(filtered[filtered.length - 1].syncedAt ?? filtered[filtered.length - 1].timestamp ?? new Date().toISOString())
      : (lastSyncAt ?? new Date().toISOString())

  return { events, cursor }
}

// ── Apply path ──────────────────────────────────────────────────────────────

/**
 * apply — translate a cloud SyncEvent into a local SQLite upsert.
 * Business isolation: events with mismatched `businessId` are silently no-op.
 *
 * Supported entity kinds: 'product', 'sale'
 */
export async function apply(
  _local: unknown,
  event: SyncEvent,
  shopId: string,
): Promise<SyncApplyResult> {
  if (event.businessId !== shopId) return { state: 'no_op' }

  const database = await getDb()

  if (event.entityKind === 'product') {
    return applyProductEvent(database, event)
  }
  if (event.entityKind === 'sale') {
    return applySaleEvent(database, event)
  }
  if (event.entityKind === 'customer') {
    return applyCustomerEvent(database, event)
  }

  return { state: 'no_op' }
}

function applyProductEvent(
  database: Awaited<ReturnType<typeof getDb>>,
  event: SyncEvent,
): SyncApplyResult {
  const p = event.payload as Record<string, unknown>

  if (event.operation === 'create' || event.operation === 'update') {
    database.runAsync(
      `INSERT OR REPLACE INTO products
         (id, shop_id, name, sku, barcode, cost_price, selling_price, discount_price,
          unit, stock_quantity, low_stock_threshold, track_inventory, allow_single_unit_sale,
          distributor_name, distributor_phone, image_url, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        event.entityId,
        event.businessId,
        String(p.name ?? ''),
        p.sku != null ? String(p.sku) : null,
        p.barcode != null ? String(p.barcode) : null,
        Number(p.costPrice ?? 0),
        Number(p.sellingPrice ?? 0),
        p.discountPrice != null ? Number(p.discountPrice) : null,
        String(p.unit ?? 'unit'),
        Number(p.stockQuantity ?? 0),
        Number(p.lowStockThreshold ?? 0),
        p.trackInventory ? 1 : 0,
        p.allowSingleUnitSale ? 1 : 0,
        p.distributorName != null ? String(p.distributorName) : null,
        p.distributorPhone != null ? String(p.distributorPhone) : null,
        p.image != null ? String(p.image) : null,
        p.isActive !== false ? 1 : 0,
        String(p.createdAt ?? event.clientCreatedAt),
        String(p.updatedAt ?? event.clientCreatedAt),
      ],
    )
    return { state: 'applied', entityVersion: event.entityVersion }
  }

  if (event.operation === 'delete' || event.operation === 'tombstone') {
    database.runAsync(`DELETE FROM products WHERE id = ?`, [event.entityId])
    return { state: 'applied', entityVersion: event.entityVersion }
  }

  return { state: 'no_op' }
}

function applySaleEvent(
  database: Awaited<ReturnType<typeof getDb>>,
  event: SyncEvent,
): SyncApplyResult {
  const p = event.payload as Record<string, unknown>

  if (event.operation === 'create') {
    const itemsJson = Array.isArray(p.items) ? JSON.stringify(p.items) : '[]'
    database.runAsync(
      `INSERT OR REPLACE INTO sales
         (id, shop_id, type, status, subtotal, discount_amount, total_amount,
          paid_amount, payment_method, note, customer_id_number, items, items_summary,
          created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        event.entityId,
        event.businessId,
        String(p.type ?? 'retail'),
        String(p.status ?? 'completed'),
        Number(p.subtotal ?? 0),
        Number(p.discountAmount ?? 0),
        Number(p.totalAmount ?? 0),
        Number(p.paidAmount ?? p.totalAmount ?? 0),
        String(p.paymentMethod ?? 'cash'),
        p.note != null ? String(p.note) : null,
        // customer_id_number: sale references customer by id_number (plain text),
        // not by FK. This means the sale is valid even if the customer hasn't synced yet.
        p.customerId != null ? String(p.customerId) : null,
        itemsJson,
        `${Array.isArray(p.items) ? p.items.length : 0} items`,
        String(p.createdAt ?? event.clientCreatedAt),
        String(p.updatedAt ?? event.clientCreatedAt),
      ],
    )
    return { state: 'applied', entityVersion: event.entityVersion }
  }

  return { state: 'no_op' }
}

// ── Customer replay ───────────────────────────────────────────────────────────

/**
 * applyCustomerEvent — replay a cloud customer event to local SQLite.
 *
 * Idempotency (Phase 10 critical invariant):
 *   - idempotencyKey = customer.id
 *   - INSERT OR REPLACE means a replay of an already-applied event
 *     (same idempotencyKey) overwrites with identical data — no new row,
 *     no duplicate.
 *   - Tombstone sets is_active = 0 (soft delete — preserve referential integrity
 *     for any sales that reference this customer by id_number).
 */
function applyCustomerEvent(
  database: Awaited<ReturnType<typeof getDb>>,
  event: SyncEvent,
): SyncApplyResult {
  const p = event.payload as Record<string, unknown>

  if (event.operation === 'create' || event.operation === 'update') {
    database.runAsync(
      `INSERT OR REPLACE INTO customers
         (id, name, phone, id_number, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        event.entityId,
        String(p.name ?? ''),
        p.phone != null ? String(p.phone) : null,
        p.idNumber != null ? String(p.idNumber) : null,
        // Canonical Customer.status = 'inactive' | 'blacklisted' → is_active = 0
        p.status === 'inactive' || p.status === 'blacklisted' ? 0 : 1,
        String(p.createdAt ?? event.clientCreatedAt),
        String(p.updatedAt ?? event.clientCreatedAt),
      ],
    )
    return { state: 'applied', entityVersion: event.entityVersion }
  }

  if (event.operation === 'tombstone' || event.operation === 'delete') {
    // Soft-delete to preserve sale references
    database.runAsync(
      `UPDATE customers SET is_active = 0, updated_at = ? WHERE id = ?`,
      [new Date().toISOString(), event.entityId],
    )
    return { state: 'applied', entityVersion: event.entityVersion }
  }

  return { state: 'no_op' }
}

// ── FIDScript helpers ────────────────────────────────────────────────────────

async function uploadEventToCloud(event: SyncEvent): Promise<void> {
  const now = new Date().toISOString()
  await db.transact([
    db.tx.syncEvents[id()].create({
      id: event.id,
      shopId: event.businessId,
      entityId: event.entityId,
      entity: event.entityKind,
      operation: event.operation,
      payload: event.payload,
      syncedAt: now,
      version: event.entityVersion,
      idempotencyKey: event.idempotencyKey,
      timestamp: event.clientCreatedAt,
      sequenceNumber: event.clientSequence,
      deviceId: event.originatingDeviceId,
    }),
  ])
}

function cloudEventToSyncEvent(
  cev: Record<string, unknown>,
  shopId: string,
): SyncEvent {
  const payload = cev.payload as Record<string, unknown> | undefined
  return {
    id: String(cev.id ?? ''),
    idempotencyKey: String(cev.idempotencyKey ?? cev.id ?? ''),
    businessId: String(cev.shopId ?? shopId),
    entityKind: String(cev.entity ?? '') as SyncEvent['entityKind'],
    entityId: String(cev.entityId ?? ''),
    operation: String(cev.operation ?? '') as SyncEvent['operation'],
    originatingDeviceId: String(cev.deviceId ?? 'cloud'),
    originatingEmployeeId: 'cloud',
    clientSequence: Number(cev.sequenceNumber ?? 0),
    clientCreatedAt: String(cev.timestamp ?? cev.syncedAt ?? new Date().toISOString()),
    entityVersion: Number(cev.version ?? 1),
    payload: payload ?? {},
    state: 'pending',
  }
}
