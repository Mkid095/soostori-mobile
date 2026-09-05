// Sale CRUD operations — business logic in services, NOT components

import AsyncStorage from '@react-native-async-storage/async-storage'
import { getDb } from '../lib/db'
import { canSell } from './db-products'
import type { Sale, SaleItem, CartItem, HeldSale } from '../lib/types'
import { generateId } from '../lib/formatters'
import { queueSync } from './sync-queue-helper'
import { mapSaleRow } from './db-sales-mapper'
import { recordInventoryTransaction } from './db-inventory-transactions'
import { logAudit } from './db-audit'
import { publishSdkEvent } from './sdk-bridge/sdk-event-bus'
import { SALE_COMPLETED, SALE_PENDING, SALE_CONFIRMED } from './sdk-bridge/sdk-bridge-types'
import { enforcePermission, PERMISSIONS } from './sdk-bridge/rbac'
import { getMobilePrimaryStatus } from './adapters/devices/mobile-primary-coordinator'
import { enforceSubscriptionOrThrow } from './sdk-bridge/subscription-gate'

async function resolveShopId(): Promise<string> {
  const stored = await AsyncStorage.getItem('@soostori:shopId')
  return stored ?? ''
}

export class InsufficientStockError extends Error {
  constructor(public productName: string, public requested: number, public available: number) {
    super(`Insufficient stock for "${productName}": requested ${requested}, available ${available}`)
    this.name = 'InsufficientStockError'
  }
}

export async function createSale(
  items: CartItem[],
  paymentMethod: Sale['paymentMethod'],
  subtotal: number,
  discountAmount: number,
  totalAmount: number,
  note?: string,
  customerIdNumber?: string
): Promise<Sale> {
  const db = await getDb()
  const id = generateId()
  const now = new Date().toISOString()
  const itemsSummary = `${items.length} item${items.length !== 1 ? 's' : ''}`
  const itemsJson = JSON.stringify(items)
  const shopId = await resolveShopId()

  // Validate stock BEFORE inserting the sale record
  for (const item of items) {
    const { ok, available } = await canSell(item.productId, item.quantity)
    if (!ok) {
      throw new InsufficientStockError(item.productName, item.quantity, available)
    }
  }

  await db.runAsync(
    `INSERT INTO sales (id, type, status, subtotal, discount_amount, total_amount, paid_amount, payment_method, note, customer_id_number, items, items_summary, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, 'retail', 'completed', subtotal, discountAmount, totalAmount, totalAmount, paymentMethod, note || null, customerIdNumber || null, itemsJson, itemsSummary, now, now]
  )

  for (const item of items) {
    const itemId = generateId()
    await db.runAsync(
      `INSERT INTO sale_items (id, sale_id, product_id, variation_name, product_name, quantity, unit_price, discount, total_price)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [itemId, id, item.productId, item.variationName || null, item.productName, item.quantity, item.unitPrice, item.discount, item.totalPrice]
    )
    // Use inventory transaction for proper event sourcing
    await recordInventoryTransaction(
      shopId,
      item.productId,
      'SALE',
      item.quantity,
      undefined, // createdBy
      undefined, // deviceId
      item.variationName || undefined,
      id,
    )
  }

  await queueSync('sales', 'create', id, shopId || undefined)
  await logAudit(shopId || 'default', 'SALE_COMPLETED', 'sale', id, undefined, undefined, undefined, JSON.stringify({ totalAmount, paymentMethod }))
  return (await getSaleById(id))!
}

// Offline variant: creates sale with pending_offline status (no host confirmation needed)
export async function createSaleOffline(
  items: CartItem[],
  paymentMethod: Sale['paymentMethod'],
  subtotal: number,
  discountAmount: number,
  totalAmount: number,
): Promise<Sale> {
  const db = await getDb()
  const id = generateId()
  const now = new Date().toISOString()
  const itemsSummary = `${items.length} item${items.length !== 1 ? 's' : ''}`
  const itemsJson = JSON.stringify(items)
  const shopId = await resolveShopId()

  await db.runAsync(
    `INSERT INTO sales (id, type, status, subtotal, discount_amount, total_amount, paid_amount, payment_method, items, items_summary, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, 'retail', 'pending_offline', subtotal, discountAmount, totalAmount, totalAmount, paymentMethod, itemsJson, itemsSummary, now, now]
  )

  for (const item of items) {
    const itemId = generateId()
    await db.runAsync(
      `INSERT INTO sale_items (id, sale_id, product_id, variation_name, product_name, quantity, unit_price, discount, total_price)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [itemId, id, item.productId, item.variationName || null, item.productName, item.quantity, item.unitPrice, item.discount, item.totalPrice]
    )
    // Use inventory transaction for proper event sourcing + current_stock cache
    await recordInventoryTransaction(
      shopId,
      item.productId,
      'SALE',
      item.quantity,
      undefined, // createdBy
      undefined, // deviceId
      item.variationName || undefined,
      id,
    )
  }

  await queueSync('sales', 'create', id, shopId || undefined)
  return (await getSaleById(id))!
}

export async function getSaleById(id: string): Promise<Sale | null> {
  const db = await getDb()
  const row = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM sales WHERE id = ?', [id]
  )
  if (!row) return null

  const items = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM sale_items WHERE sale_id = ?', [id]
  )

  return {
    id: String(row.id),
    type: String(row.type || 'retail') as Sale['type'],
    status: String(row.status || 'completed') as Sale['status'],
    subtotal: Number(row.subtotal) || 0,
    discountAmount: Number(row.discount_amount) || 0,
    totalAmount: Number(row.total_amount) || 0,
    paidAmount: Number(row.paid_amount) || 0,
    paymentMethod: String(row.payment_method) as Sale['paymentMethod'],
    note: row.note ? String(row.note) : undefined,
    customerIdNumber: row.customer_id_number ? String(row.customer_id_number) : undefined,
    items_summary: row.items_summary ? String(row.items_summary) : undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    items: items.map((item) => ({
      id: String(item.id),
      saleId: String(item.sale_id),
      productId: item.product_id ? String(item.product_id) : undefined,
      variationName: item.variation_name ? String(item.variation_name) : undefined,
      productName: String(item.product_name),
      quantity: Number(item.quantity) || 0,
      unitPrice: Number(item.unit_price) || 0,
      discount: Number(item.discount) || 0,
      totalPrice: Number(item.total_price) || 0,
    })),
  }
}

export async function getTodaySales(): Promise<Sale[]> {
  const db = await getDb()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString()
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM sales WHERE created_at >= ? ORDER BY created_at DESC', [todayStr]
  )
  return rows.map(mapSaleRow)
}

export async function getWeekSales(): Promise<Sale[]> {
  const db = await getDb()
  const date = new Date()
  date.setDate(date.getDate() - 7)
  date.setHours(0, 0, 0, 0)
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM sales WHERE created_at >= ? ORDER BY created_at DESC', [date.toISOString()]
  )
  return rows.map(mapSaleRow)
}

export async function getMonthSales(): Promise<Sale[]> {
  const db = await getDb()
  const date = new Date()
  date.setMonth(date.getMonth() - 1)
  date.setHours(0, 0, 0, 0)
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM sales WHERE created_at >= ? ORDER BY created_at DESC', [date.toISOString()]
  )
  return rows.map(mapSaleRow)
}

export async function getAllSales(): Promise<Sale[]> {
  const db = await getDb()
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM sales ORDER BY created_at DESC LIMIT 200'
  )
  return rows.map(mapSaleRow)
}

export async function holdSale(items: CartItem[], name?: string, paymentMethod?: string): Promise<string> {
  const db = await getDb()
  const id = generateId()
  const now = new Date().toISOString()
  await db.runAsync(
    'INSERT INTO held_sales (id, name, cart_items, payment_method, created_at) VALUES (?, ?, ?, ?, ?)',
    [id, name || null, JSON.stringify(items), paymentMethod || null, now]
  )
  await queueSync('held_sales', 'create', id)
  return id
}

export async function getLastHeldSale(): Promise<CartItem[] | null> {
  const db = await getDb()
  const row = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM held_sales ORDER BY created_at DESC LIMIT 1'
  )
  if (!row || !row.cart_items) return null
  return JSON.parse(String(row.cart_items)) as CartItem[]
}

export async function getHeldSales(): Promise<HeldSale[]> {
  const db = await getDb()
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM held_sales ORDER BY created_at DESC LIMIT 50'
  )
  return rows.map((row) => ({
    id: String(row.id),
    name: row.name ? String(row.name) : undefined,
    cartItems: JSON.parse(String(row.cart_items || '[]')) as CartItem[],
    paymentMethod: String(row.payment_method || 'cash'),
    createdAt: String(row.created_at),
  }))
}

export async function deleteHeldSale(id: string): Promise<void> {
  const db = await getDb()
  await db.runAsync('DELETE FROM held_sales WHERE id = ?', [id])
  await queueSync('held_sales', 'delete', id)
}

export interface ReceiptHistoryItem {
  id: string
  receiptNumber: string
  date: string
  total: number
  paymentMethod: string
  itemsCount: number
  itemsSummary: string
}

function formatReceiptDate(isoString: string): string {
  const d = new Date(isoString)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function buildReceiptNumber(id: string): string {
  return `R${id.slice(-8).toUpperCase()}`
}

export async function getReceiptHistory(limit = 100): Promise<ReceiptHistoryItem[]> {
  const db = await getDb()
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT id, total_amount, payment_method, items_summary, created_at
     FROM sales
     WHERE status = 'completed'
     ORDER BY created_at DESC
     LIMIT ?`,
    [limit]
  )
  return rows.map((row) => ({
    id: String(row.id),
    receiptNumber: buildReceiptNumber(String(row.id)),
    date: formatReceiptDate(String(row.created_at)),
    total: Number(row.total_amount) || 0,
    paymentMethod: String(row.payment_method || 'cash'),
    itemsCount: row.items_summary
      ? parseInt(String(row.items_summary).replace(/[^0-9]/g, ''), 10) || 0
      : 0,
    itemsSummary: String(row.items_summary || '0 items'),
  }))
}

// ── Pending sale flow (desktop sync) ──────────────────────────────────────────
// Mobile calls createPendingSale → desktop confirms with confirmPendingSale

export async function createPendingSale(
  shopId: string,
  employeeId: string,
  deviceId: string,
  items: Array<{ productId: string; variationName?: string; quantity: number; unitPrice: number; totalPrice: number }>,
  totalAmount: number,
  paymentMethod: string,
): Promise<Sale> {
  const db = await getDb()
  const id = generateId()
  const now = new Date().toISOString()
  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)
  const discountAmount = subtotal - items.reduce((sum, i) => sum + i.totalPrice, 0)

  await db.runAsync(
    `INSERT INTO sales (id, type, status, subtotal, discount_amount, total_amount, paid_amount, payment_method, shop_id, employee_id, device_id, created_at, updated_at)
     VALUES (?, 'retail', 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, subtotal, discountAmount, totalAmount, totalAmount, paymentMethod, shopId, employeeId, deviceId, now, now]
  )

  for (const item of items) {
    await db.runAsync(
      `INSERT INTO sale_items (id, sale_id, product_id, variation_name, product_name, quantity, unit_price, discount, total_price)
       SELECT ?, ?, ?, ?, name, ?, ?, 0, ? FROM products WHERE id = ?`,
      [generateId(), id, item.productId, item.variationName ?? null, item.quantity, item.unitPrice, item.totalPrice, item.productId]
    )
  }

  return {
    id, shopId, employeeId, deviceId,
    status: 'pending',
    paymentMethod,
    subtotal, discountAmount, totalAmount,
    paidAmount: 0,
    createdAt: now, updatedAt: now,
  } as unknown as Sale
}

export async function confirmPendingSale(saleId: string, employeeId: string): Promise<void> {
  const db = await getDb()
  const now = new Date().toISOString()

  const saleRow = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM sales WHERE id = ? AND status = ?', [saleId, 'pending']
  )
  if (!saleRow) throw new Error(`Pending sale ${saleId} not found`)

  const itemRows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM sale_items WHERE sale_id = ?', [saleId]
  )

  for (const item of itemRows) {
    await recordInventoryTransaction(
      String(saleRow.shop_id),
      String(item.product_id),
      'SALE',
      Number(item.quantity),
      employeeId,
      String(saleRow.device_id),
      item.variation_name ? String(item.variation_name) : undefined,
      saleId,
    )
  }

  await db.runAsync(
    `UPDATE sales SET status = 'completed', updated_at = ? WHERE id = ?`,
    [now, saleId]
  )
}

export async function rejectPendingSale(saleId: string): Promise<void> {
  const db = await getDb()
  const now = new Date().toISOString()
  await db.runAsync(
    `UPDATE sales SET status = 'rejected', updated_at = ? WHERE id = ? AND status = 'pending'`,
    [now, saleId]
  )
}

export async function getPendingSales(shopId: string): Promise<Sale[]> {
  const db = await getDb()
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM sales WHERE shop_id = ? AND status = 'pending' ORDER BY created_at ASC`,
    [shopId]
  )
  return rows.map(r => ({
    id: String(r.id), shopId: String(r.shop_id), employeeId: String(r.employee_id),
    deviceId: String(r.device_id), status: 'pending' as Sale['status'],
    paymentMethod: r.payment_method ? String(r.payment_method) : undefined,
    subtotal: Number(r.subtotal), discountAmount: Number(r.discount_amount),
    totalAmount: Number(r.total_amount),
    paidAmount: Number(r.paid_amount) || 0,
    customerIdNumber: r.customer_id_number ? String(r.customer_id_number) : undefined,
    note: r.note ? String(r.note) : undefined,
    createdAt: String(r.created_at), updatedAt: String(r.updated_at),
  })) as unknown as Sale[]
}
