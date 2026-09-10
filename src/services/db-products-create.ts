// db-products-create.ts — Product creation logic
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getDb } from '../lib/db'
import type { Product } from '../lib/types'
import { generateId } from '../lib/formatters'
import { queueSync } from './sync-queue-helper'
import { getProductById } from './db-products-queries'
import { enforcePermission, PERMISSIONS } from './sdk-bridge/rbac'
import { enforceSubscriptionOrThrow } from './sdk-bridge/subscription-gate'
import { getCurrentRole, getCurrentShopId } from './session-helper'
import { defaultSyncEngine } from '@soostori/contracts'
import { fromLocalProduct } from '../lib/contracts-mapper'

export async function createProduct(data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
  await enforceSubscriptionOrThrow()
  await enforcePermission(await getCurrentRole(), PERMISSIONS.INVENTORY_EDIT)
  const db = await getDb()
  const id = generateId()
  const now = new Date().toISOString()
  const groupPrices = data.groupPrices ? JSON.stringify(data.groupPrices) : null
  const cols = 'id, category_id, category_name, category_color, name, sku, barcode, image_url, cost_price, selling_price, discount_price, unit, stock_quantity, low_stock_threshold, track_inventory, allow_single_unit_sale, distributor_name, distributor_phone, units_per_package, box_buying_price, group_prices, is_active, created_at, updated_at'
  const vals = '?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?'
  await db.runAsync(`INSERT INTO products (${cols}) VALUES (${vals})`, [
    id, data.categoryId || null, data.categoryName || null, data.categoryColor || null,
    data.name, data.sku || null, data.barcode || null, data.imageUrl || null,
    data.costPrice, data.sellingPrice, data.discountPrice || null, data.unit,
    data.stockQuantity, data.lowStockThreshold,
    data.trackInventory ? 1 : 0, data.allowSingleUnitSale ? 1 : 0,
    data.distributorName || null, data.distributorPhone || null,
    data.unitsPerPackage || null, data.boxBuyingPrice || null, groupPrices, now, now])
  await queueSync('products', 'create', id)
  // Cycle 04 Sub-F — emit SyncEvent on the canonical engine after the local
  // commit lands. Fire-and-forget: a sync-engine failure must not break the
  // local INSERT path (real engine retries via `sync_queue`).
  enqueueProductSyncEvent(id).catch(() => { /* swallow — local DB is source of truth */ })
  return (await getProductById(id))!
}

/**
 * Sub-F — build and enqueue a SyncEvent<Product> on `defaultSyncEngine`.
 * Reads the just-inserted row via the local mapper so the payload matches
 * the @soostori/contracts `Product` shape exactly (see sync-contract.ts §6).
 */
async function enqueueProductSyncEvent(productId: string): Promise<void> {
  const db = await getDb()
  const row = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM products WHERE id = ?', [productId],
  )
  if (!row) return
  const businessId = await getCurrentShopId()
  if (!businessId) return // no tenant context — skip; queueSync already required it
  const entity = fromLocalProduct(row)
  await defaultSyncEngine.enqueue({
    // brand-helper casts — Sub-D left @soostori/core at alpha.7; SyncEvent
    // fields are SyncEventId/IdempotencyKey/BusinessId/DeviceId/EmployeeId.
    // Sub-cycle F moves on per the brief: documented, not redesigned.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    id: generateId() as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    idempotencyKey: ((entity as { idempotencyKey?: string }).idempotencyKey ?? productId) as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    businessId: String(entity.businessId) as any,
    entityKind: 'product',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    entityId: String(entity.id) as any,
    operation: 'create',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    originatingDeviceId: String(entity.businessId) as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    originatingEmployeeId: 'system' as any,
    clientSequence: Date.now(),
    clientCreatedAt: entity.createdAt,
    entityVersion: entity.version,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload: entity as any,
    state: 'pending',
  })
}
