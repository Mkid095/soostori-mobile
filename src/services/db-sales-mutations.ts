// db-sales-mutations.ts — Sale write operations (non-createSale, hold/release)
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getDb } from '../lib/db'
import type { CartItem } from '../lib/types'
import { generateId } from '../lib/formatters'
import { queueSync } from './sync-queue-helper'
import { mapPendingSaleRow } from './db-sales-mapper-helpers'

async function resolveShopId(): Promise<string> {
  const stored = await AsyncStorage.getItem('@soostori:shopId')
  if (!stored) throw new Error('No shop context — cannot create sale')
  return stored
}

export async function holdSale(items: CartItem[], name?: string, paymentMethod?: string): Promise<string> {
  const db = await getDb()
  const id = generateId()
  const now = new Date().toISOString()
  await db.runAsync(
    'INSERT INTO held_sales (id, name, cart_items, payment_method, created_at) VALUES (?, ?, ?, ?, ?)',
    [id, name || null, JSON.stringify(items), paymentMethod || null, now])
  await queueSync('held_sales', 'create', id)
  return id
}

export async function deleteHeldSale(id: string): Promise<void> {
  const db = await getDb()
  await db.runAsync('DELETE FROM held_sales WHERE id = ?', [id])
  await queueSync('held_sales', 'delete', id)
}

export async function createPendingSale(
  shopId: string, employeeId: string, deviceId: string,
  items: Array<{ productId: string; variationName?: string; quantity: number; unitPrice: number; totalPrice: number }>,
  totalAmount: number, paymentMethod: string,
): Promise<import('../lib/types').Sale> {
  const db = await getDb()
  const id = generateId()
  const now = new Date().toISOString()
  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)
  const discountAmount = subtotal - items.reduce((sum, i) => sum + i.totalPrice, 0)

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO sales (id, type, status, subtotal, discount_amount, total_amount, paid_amount, payment_method, shop_id, employee_id, device_id, created_at, updated_at) VALUES (?, 'retail', 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, subtotal, discountAmount, totalAmount, totalAmount, paymentMethod, shopId, employeeId, deviceId, now, now])
    for (const item of items) {
      await db.runAsync(
        `INSERT INTO sale_items (id, sale_id, product_id, variation_name, product_name, quantity, unit_price, discount, total_price) SELECT ?, ?, ?, ?, name, ?, ?, 0, ? FROM products WHERE id = ?`,
        [generateId(), id, item.productId, item.variationName ?? null, item.quantity, item.unitPrice, item.totalPrice, item.productId])
    }
  })
  return { id, shopId, employeeId, deviceId, type: 'retail' as const, status: 'pending' as const, paymentMethod, subtotal, discountAmount, totalAmount, paidAmount: 0, createdAt: now, updatedAt: now } as unknown as import('../lib/types').Sale
}

export async function confirmPendingSale(saleId: string, employeeId: string): Promise<void> {
  const db = await getDb()
  const now = new Date().toISOString()
  await db.withTransactionAsync(async () => {
    const saleRow = await db.getFirstAsync<Record<string, unknown>>('SELECT * FROM sales WHERE id = ? AND status = ?', [saleId, 'pending'])
    if (!saleRow) throw new Error(`Pending sale ${saleId} not found`)
    const itemRows = await db.getAllAsync<Record<string, unknown>>('SELECT * FROM sale_items WHERE sale_id = ?', [saleId])
    const { recordInventoryTransaction } = await import('./db-inventory-transactions')
    for (const item of itemRows) {
      await recordInventoryTransaction(String(saleRow.shop_id), String(item.product_id), 'SALE', Number(item.quantity), employeeId, String(saleRow.device_id), item.variation_name ? String(item.variation_name) : undefined, saleId)
    }
    await db.runAsync(`UPDATE sales SET status = 'completed', updated_at = ? WHERE id = ?`, [now, saleId])
  })
}

export async function rejectPendingSale(saleId: string): Promise<void> {
  const db = await getDb()
  const now = new Date().toISOString()
  await db.runAsync(`UPDATE sales SET status = 'rejected', updated_at = ? WHERE id = ? AND status = 'pending'`, [now, saleId])
}
