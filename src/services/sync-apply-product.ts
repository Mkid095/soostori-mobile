// sync-apply-product.ts — Phase 16: apply product SyncEvent to local SQLite

import { getDb } from '../lib/db'
import type { SyncEvent } from '@soostori/contracts'
import type { SyncApplyResult } from '@soostori/contracts'

export async function applyProductEvent(
  database: Awaited<ReturnType<typeof getDb>>,
  event: SyncEvent,
): Promise<SyncApplyResult> {
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
