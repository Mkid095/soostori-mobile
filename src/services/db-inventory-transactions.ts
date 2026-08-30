// Inventory transactions — desktop-agent
// Writes transactions + updates products.current_stock cache
import { getDb } from '../lib/db'
import type { InventoryTransaction, InventoryTransactionType } from '../lib/sync-protocol'
import { generateId } from '../lib/formatters'

export async function recordInventoryTransaction(
  shopId: string,
  productId: string,
  type: InventoryTransactionType,
  quantity: number,
  createdBy?: string,
  deviceId?: string,
  variantName?: string,
  referenceId?: string,
  reason?: string,
): Promise<InventoryTransaction> {
  const db = await getDb()
  // Read current_stock cache
  const prod = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT current_stock FROM products WHERE id = ?', [productId]
  )
  const currentStock = prod ? Number(prod.current_stock) : 0

  // Compute delta: SALE/SALE_CANCELLED are negative, rest are positive
  const delta = (type === 'SALE' || type === 'SALE_CANCELLED') ? -Math.abs(quantity) : Math.abs(quantity)
  const balanceAfter = currentStock + delta

  const id = generateId()
  const now = new Date().toISOString()

  await db.runAsync(
    `INSERT INTO inventory_transactions
       (id, shop_id, product_id, variant_name, type, quantity, balance_after, created_by, device_id, reference_id, reason, timestamp)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, shopId, productId, variantName ?? null, type, quantity, balanceAfter, createdBy ?? null, deviceId ?? null, referenceId ?? null, reason ?? null, now]
  )

  // Update products.current_stock cache
  await db.runAsync(
    'UPDATE products SET current_stock = ? WHERE id = ?',
    [balanceAfter, productId]
  )

  return { id, shopId, productId, variantName, type, quantity, balanceAfter, createdBy, deviceId, referenceId, reason, timestamp: now }
}

export async function getTransactionsByProduct(
  productId: string,
  limit = 20,
): Promise<InventoryTransaction[]> {
  const db = await getDb()
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM inventory_transactions WHERE product_id = ? ORDER BY timestamp DESC LIMIT ?`,
    [productId, limit]
  )
  return rows.map(row => ({
    id: String(row.id),
    shopId: String(row.shop_id),
    productId: String(row.product_id),
    variantName: row.variant_name ? String(row.variant_name) : undefined,
    type: String(row.type) as InventoryTransactionType,
    quantity: Number(row.quantity),
    balanceAfter: Number(row.balance_after),
    createdBy: row.created_by ? String(row.created_by) : undefined,
    deviceId: row.device_id ? String(row.device_id) : undefined,
    referenceId: row.reference_id ? String(row.reference_id) : undefined,
    reason: row.reason ? String(row.reason) : undefined,
    timestamp: String(row.timestamp),
  }))
}
