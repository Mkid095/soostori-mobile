// Sync queue processor — uploads pending local events to cloud
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getDb } from '../lib/db'
import { getSyncState, updateSyncState } from './db-sync-state'
import { markSyncEventRetryable } from './sync-queue-helper'
import { cloudDownloadEvents } from './cloud-sync-api'
import { cloudEventToSyncEvent } from './sync-apply'
import { deductSaleStock } from './inventory-ledger-service'
import type { SyncEvent } from '@soostori/contracts'
import type { SyncApplyResult } from '@soostori/contracts'

const SYNC_INTERVAL_MS = 60_000 // 1 minute

interface QueuedEvent {
  id: string
  tableName: string
  action: string
  payload: string
  status: string
  createdAt: number
}

export async function getQueuedEvents(limit = 50): Promise<QueuedEvent[]> {
  const db = await getDb()
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM sync_queue WHERE status = 'pending' ORDER BY created_at ASC LIMIT ?`,
    [limit]
  )
  return rows.map(r => ({
    id: String(r.id),
    tableName: String(r.table_name),
    action: String(r.action),
    payload: String(r.payload),
    status: String(r.status),
    createdAt: Number(r.created_at),
  }))
}

export async function markEventSynced(eventId: string): Promise<void> {
  const db = await getDb()
  await db.runAsync(
    `UPDATE sync_queue SET status = 'synced', synced_at = ? WHERE id = ?`,
    [Date.now(), eventId]
  )
}

export async function markEventFailed(eventId: string): Promise<void> {
  const db = await getDb()
  await db.runAsync(
    `UPDATE sync_queue SET status = 'failed' WHERE id = ?`,
    [eventId]
  )
}

async function shouldSync(): Promise<boolean> {
  const state = await getSyncState()
  if (!state.lastCloudSyncAt) return true
  const elapsed = Date.now() - new Date(state.lastCloudSyncAt).getTime()
  return elapsed >= SYNC_INTERVAL_MS
}

async function uploadEventBatch(events: QueuedEvent[]): Promise<void> {
  const { cloudUploadEvents } = await import('./cloud-sync-api')
  const { getCurrentShopId } = await import('./session-helper')
  const shopId = await getCurrentShopId()
  if (!shopId) return
  await cloudUploadEvents(events.map(e => ({
    tableName: e.tableName,
    action: e.action,
    payload: JSON.parse(e.payload),
    timestamp: new Date(e.createdAt).toISOString(),
    shopId,
  })))
}

/**
 * Apply a single remote cloud event to local SQLite.
 * Routes by entity kind and calls the inventory ledger for sale items.
 */
async function applyRemoteEvent(
  event: SyncEvent,
  shopId: string,
): Promise<SyncApplyResult> {
  const db = await getDb()
  const p = event.payload as Record<string, unknown>

  switch (event.entityKind) {
    case 'product': {
      if (event.operation === 'create' || event.operation === 'update') {
        await db.runAsync(
          `INSERT OR REPLACE INTO products
             (id, shop_id, name, sku, barcode, cost_price, selling_price, discount_price,
              unit, stock_quantity, low_stock_threshold, track_inventory, allow_single_unit_sale,
              distributor_name, distributor_phone, image_url, is_active, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            event.entityId,
            shopId,
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
        await db.runAsync(`DELETE FROM products WHERE id = ?`, [event.entityId])
        return { state: 'applied', entityVersion: event.entityVersion }
      }
      return { state: 'no_op' }
    }

    case 'sale': {
      if (event.operation === 'create') {
        const itemsJson = Array.isArray(p.items) ? JSON.stringify(p.items) : '[]'
        await db.runAsync(
          `INSERT OR REPLACE INTO sales
             (id, shop_id, type, status, subtotal, discount_amount, total_amount,
              paid_amount, payment_method, note, customer_id_number, items, items_summary,
              created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            event.entityId,
            shopId,
            String(p.type ?? 'retail'),
            String(p.status ?? 'completed'),
            Number(p.subtotal ?? 0),
            Number(p.discountAmount ?? 0),
            Number(p.totalAmount ?? 0),
            Number(p.paidAmount ?? p.totalAmount ?? 0),
            String(p.paymentMethod ?? 'cash'),
            p.note != null ? String(p.note) : null,
            p.customerId != null ? String(p.customerId) : null,
            itemsJson,
            `${Array.isArray(p.items) ? p.items.length : 0} items`,
            String(p.createdAt ?? event.clientCreatedAt),
            String(p.updatedAt ?? event.clientCreatedAt),
          ],
        )
        // Deduct stock for each sale item via the inventory ledger
        if (Array.isArray(p.items)) {
          for (const item of p.items as Array<Record<string, unknown>>) {
            try {
              await deductSaleStock(
                event.entityId,
                String(item.productId),
                Number(item.quantity),
                `${event.idempotencyKey}:${event.entityId}:${String(item.productId)}`,
              )
            } catch (err) {
              console.warn('[PullSync] deductSaleStock failed:', err)
            }
          }
        }
        return { state: 'applied', entityVersion: event.entityVersion }
      }
      return { state: 'no_op' }
    }

    case 'customer': {
      if (event.operation === 'create' || event.operation === 'update') {
        await db.runAsync(
          `INSERT OR REPLACE INTO customers
             (id, name, phone, id_number, is_active, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            event.entityId,
            String(p.name ?? ''),
            p.phone != null ? String(p.phone) : null,
            p.idNumber != null ? String(p.idNumber) : null,
            p.status === 'inactive' || p.status === 'blacklisted' ? 0 : 1,
            String(p.createdAt ?? event.clientCreatedAt),
            String(p.updatedAt ?? event.clientCreatedAt),
          ],
        )
        return { state: 'applied', entityVersion: event.entityVersion }
      }
      if (event.operation === 'tombstone' || event.operation === 'delete') {
        await db.runAsync(
          `UPDATE customers SET is_active = 0, updated_at = ? WHERE id = ?`,
          [new Date().toISOString(), event.entityId],
        )
        return { state: 'applied', entityVersion: event.entityVersion }
      }
      return { state: 'no_op' }
    }

    case 'stockMovement': {
      if (event.operation === 'create') {
        await db.runAsync(
          `INSERT OR REPLACE INTO inventory_transactions
             (id, shop_id, product_id, variant_id, variant_name, type, quantity,
              balance_after, created_by, device_id, reference_id, reason, timestamp,
              idempotency_key)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            event.entityId,
            shopId,
            String(p.productId ?? ''),
            p.variantId != null ? String(p.variantId) : null,
            p.variantName != null ? String(p.variantName) : null,
            String(p.type ?? ''),
            Number(p.quantity ?? 0),
            Number(p.balanceAfter ?? 0),
            p.createdBy != null ? String(p.createdBy) : null,
            p.deviceId != null ? String(p.deviceId) : null,
            p.referenceId != null ? String(p.referenceId) : null,
            p.reason != null ? String(p.reason) : null,
            String(p.timestamp ?? event.clientCreatedAt),
            event.idempotencyKey ?? event.entityId,
          ],
        )
        return { state: 'applied', entityVersion: event.entityVersion }
      }
      return { state: 'no_op' }
    }

    case 'debt': {
      if (event.operation === 'create') {
        await db.runAsync(
          `INSERT OR REPLACE INTO debts
             (id, business_id, customer_name, phone, id_number, amount,
              amount_paid, status, note, created_at, updated_at, idempotency_key)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            event.entityId,
            shopId,
            String(p.customerName ?? ''),
            p.phone != null ? String(p.phone) : null,
            p.idNumber != null ? String(p.idNumber) : null,
            Number(p.amount ?? 0),
            Number(p.amountPaid ?? 0),
            String(p.status ?? 'pending'),
            p.note != null ? String(p.note) : null,
            String(p.createdAt ?? event.clientCreatedAt),
            String(p.updatedAt ?? event.clientCreatedAt),
            event.idempotencyKey ?? event.entityId,
          ],
        )
        return { state: 'applied', entityVersion: event.entityVersion }
      }
      return { state: 'no_op' }
    }

    default:
      return { state: 'no_op' }
  }
}

/**
 * Pull cloud events and apply them to local SQLite.
 * Called after drain (upload) completes successfully.
 */
async function pullAndApplyRemote(shopId: string, lastCloudSyncAt: string | null): Promise<number> {
  const remoteEvents = await cloudDownloadEvents(shopId, lastCloudSyncAt ?? undefined)
  if (remoteEvents.length === 0) return 0

  const db = await getDb()
  let applied = 0
  let latestServerTime: string | null = null

  for (const rawEvent of remoteEvents) {
    // Deduplicate by idempotency_key
    const key = String(rawEvent.idempotencyKey ?? rawEvent.id ?? '')
    if (key) {
      const existing = await db.getFirstAsync<{ idempotency_key: string }>(
        `SELECT idempotency_key FROM sync_processed WHERE idempotency_key = ?`,
        [key],
      )
      if (existing) continue
    }

    // Convert cloud event to SyncEvent
    const event: SyncEvent = cloudEventToSyncEvent(
      rawEvent as unknown as Record<string, unknown>,
      shopId,
    )

    const result = await applyRemoteEvent(event, shopId)
    if (result.state === 'applied') {
      // Write dedup key
      await db.runAsync(
        `INSERT OR IGNORE INTO sync_processed
           (idempotency_key, business_id, entity_kind, entity_id, operation, applied_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          key,
          shopId,
          event.entityKind,
          event.entityId,
          event.operation,
          new Date().toISOString(),
        ],
      )
      applied++

      // Track latest serverReceivedAt for cursor update
      const serverTime = String((rawEvent as unknown as Record<string, unknown>).serverReceivedAt ?? '')
      if (serverTime && (!latestServerTime || serverTime > latestServerTime)) {
        latestServerTime = serverTime
      }
    }
  }

  // Update sync cursor to latest server time
  if (latestServerTime) {
    await updateSyncState({ lastCloudSyncAt: latestServerTime })
  }

  return applied
}

export async function processSyncQueue(): Promise<{ processed: number; failed: number }> {
  const shopId = (await import('./session-helper')).getCurrentShopId() as unknown as string | null
  if (!shopId) return { processed: 0, failed: 0 }

  // ── Drain: upload pending local events to cloud ──────────────────────────
  const events = await getQueuedEvents(50)
  let processed = 0
  let failed = 0

  for (const event of events) {
    try {
      await uploadEventBatch([event])
      await markEventSynced(event.id)
      processed++
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (message.includes('401') || message.includes('UNAUTHORIZED')) {
        await markEventFailed(event.id)
        failed++
        await AsyncStorage.removeItem('@soostori:entitlement')
        await AsyncStorage.removeItem('@soostori:verificationDeadline')
      } else {
        await markSyncEventRetryable(event.id)
      }
    }
  }

  // ── Pull: fetch remote cloud events and apply to local SQLite ─────────────
  const state = await getSyncState()
  try {
    await pullAndApplyRemote(shopId, state.lastCloudSyncAt ?? null)
  } catch (err) {
    console.warn('[PullSync] pullAndApplyRemote failed:', err)
  }

  await updateSyncState({ lastCloudSyncAt: new Date().toISOString() })

  return { processed, failed }
}

let syncTimer: ReturnType<typeof setInterval> | null = null

export function startSyncWorker(): void {
  if (syncTimer) return
  syncTimer = setInterval(async () => {
    const shouldRun = await shouldSync()
    if (shouldRun) {
      try {
        await processSyncQueue()
      } catch { /* non-fatal */ }
    }
  }, SYNC_INTERVAL_MS)
}

export function stopSyncWorker(): void {
  if (syncTimer) {
    clearInterval(syncTimer)
    syncTimer = null
  }
}
