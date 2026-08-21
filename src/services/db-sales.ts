// Sale CRUD operations — business logic in services, NOT components

import { getDb } from '../lib/db'
import type { Sale, SaleItem, CartItem, HeldSale } from '../lib/types'
import { generateId } from '../lib/formatters'
import { queueSync } from './sync-queue-helper'
import { mapSaleRow } from './db-sales-mapper'

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

  await db.runAsync(
    `INSERT INTO sales (id, type, status, subtotal, discount_amount, total_amount, paid_amount, payment_method, note, customer_id_number, items, items_summary, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, 'retail', 'completed', subtotal, discountAmount, totalAmount, totalAmount, paymentMethod, note || null, customerIdNumber || null, itemsJson, itemsSummary, now, now]
  )

  for (const item of items) {
    const itemId = generateId()
    await db.runAsync(
      `INSERT INTO sale_items (id, sale_id, product_id, product_name, quantity, unit_price, discount, total_price)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [itemId, id, item.productId, item.productName, item.quantity, item.unitPrice, item.discount, item.totalPrice]
    )
    // Adjust stock
    await db.runAsync(
      'UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?',
      [item.quantity, item.productId]
    )
  }

  await queueSync('sales', 'create', id)
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
