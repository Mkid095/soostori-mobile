// db-sales-queries.ts — Core sale read operations
import { getDb } from '../lib/db'
import type { Sale, CartItem, HeldSale } from '../lib/types'
import { mapSaleRow } from './db-sales-mapper'
import { mapSaleItemRow, mapPendingSaleRow } from './db-sales-mapper-helpers'

export async function getSaleById(id: string): Promise<Sale | null> {
  const db = await getDb()
  const row = await db.getFirstAsync<Record<string, unknown>>('SELECT * FROM sales WHERE id = ?', id)
  if (!row) return null
  const items = await db.getAllAsync<Record<string, unknown>>('SELECT * FROM sale_items WHERE sale_id = ?', id)
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
    items: items.map(mapSaleItemRow),
  }
}

export async function getHeldSales(): Promise<HeldSale[]> {
  const db = await getDb()
  const rows = await db.getAllAsync<Record<string, unknown>>('SELECT * FROM held_sales ORDER BY created_at DESC LIMIT 50')
  return rows.map((row) => ({
    id: String(row.id),
    name: row.name ? String(row.name) : undefined,
    cartItems: JSON.parse(String(row.cart_items || '[]')) as CartItem[],
    paymentMethod: String(row.payment_method || 'cash'),
    createdAt: String(row.created_at),
  }))
}

export async function getLastHeldSale(): Promise<CartItem[] | null> {
  const db = await getDb()
  const row = await db.getFirstAsync<Record<string, unknown>>('SELECT * FROM held_sales ORDER BY created_at DESC LIMIT 1')
  if (!row || !row.cart_items) return null
  return JSON.parse(String(row.cart_items)) as CartItem[]
}

export interface ReceiptHistoryItem {
  id: string; receiptNumber: string; date: string; total: number; paymentMethod: string; itemsCount: number; itemsSummary: string
}

function formatReceiptDate(isoString: string): string {
  const d = new Date(isoString)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function buildReceiptNumber(id: string): string { return `R${id.slice(-8).toUpperCase()}` }

export async function getReceiptHistory(limit = 100): Promise<ReceiptHistoryItem[]> {
  const db = await getDb()
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT id, total_amount, payment_method, items_summary, created_at FROM sales WHERE status = 'completed' ORDER BY created_at DESC LIMIT ?`, [limit])
  return rows.map((row) => ({
    id: String(row.id),
    receiptNumber: buildReceiptNumber(String(row.id)),
    date: formatReceiptDate(String(row.created_at)),
    total: Number(row.total_amount) || 0,
    paymentMethod: String(row.payment_method || 'cash'),
    itemsCount: row.items_summary ? parseInt(String(row.items_summary).replace(/[^0-9]/g, ''), 10) || 0 : 0,
    itemsSummary: String(row.items_summary || '0 items'),
  }))
}

export async function getPendingSales(shopId: string): Promise<Sale[]> {
  const db = await getDb()
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM sales WHERE shop_id = ? AND status = 'pending' ORDER BY created_at ASC`, [shopId])
  return rows.map(mapPendingSaleRow)
}
