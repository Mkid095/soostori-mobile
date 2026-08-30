// Client (customer) CRUD operations — business logic in services, NOT components

import { getDb } from '../lib/db'
import type { Client, Sale } from '../lib/types'
import { generateId } from '../lib/formatters'
import { queueSync } from './sync-queue-helper'

export async function getClients(): Promise<Client[]> {
  const db = await getDb()
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM customers WHERE is_active = 1 ORDER BY name ASC LIMIT 500'
  )
  return rows.map(mapRow)
}

export async function searchClients(query: string): Promise<Client[]> {
  const db = await getDb()
  const q = `%${query}%`
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM customers WHERE is_active = 1 AND (name LIKE ? OR phone LIKE ?) ORDER BY name ASC LIMIT 20',
    [q, q]
  )
  return rows.map(mapRow)
}

export async function getClientById(id: string): Promise<Client | null> {
  const db = await getDb()
  const row = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM customers WHERE id = ?', [id]
  )
  return row ? mapRow(row) : null
}

export async function createClient(data: {
  name: string
  phone?: string
  idNumber?: string
}): Promise<Client> {
  const db = await getDb()
  const id = generateId()
  const now = new Date().toISOString()
  await db.runAsync(
    `INSERT INTO customers (id, name, phone, id_number, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, 1, ?, ?)`,
    [id, data.name, data.phone || null, data.idNumber || null, now, now]
  )
  await queueSync('customers', 'create', id)
  return (await getClientById(id))!
}

export async function updateClient(
  id: string,
  data: { name?: string; phone?: string; idNumber?: string }
): Promise<Client | null> {
  const db = await getDb()
  const now = new Date().toISOString()
  const fields: string[] = []
  const values: (string | number | null)[] = []
  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name) }
  if (data.phone !== undefined) { fields.push('phone = ?'); values.push(data.phone ?? null) }
  if (data.idNumber !== undefined) { fields.push('id_number = ?'); values.push(data.idNumber ?? null) }
  if (fields.length === 0) return getClientById(id)
  fields.push('updated_at = ?')
  values.push(now)
  values.push(id)
  await db.runAsync(`UPDATE customers SET ${fields.join(', ')} WHERE id = ?`, values)
  await queueSync('customers', 'update', id)
  return getClientById(id)
}

export async function deleteClient(id: string): Promise<void> {
  const db = await getDb()
  const now = new Date().toISOString()
  await db.runAsync(
    'UPDATE customers SET is_active = 0, updated_at = ? WHERE id = ?',
    [now, id]
  )
  await queueSync('customers', 'update', id)
}

export async function getClientPurchaseHistory(
  customerIdNumber: string
): Promise<Sale[]> {
  const db = await getDb()
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM sales
     WHERE customer_id_number = ? AND status = 'completed'
     ORDER BY created_at DESC LIMIT 50`,
    [customerIdNumber]
  )
  return rows.map((row) => ({
    id: String(row.id),
    type: (row.type as Sale['type']) || 'retail',
    status: (row.status as Sale['status']) || 'completed',
    subtotal: Number(row.subtotal) || 0,
    discountAmount: Number(row.discount_amount) || 0,
    totalAmount: Number(row.total_amount) || 0,
    paidAmount: Number(row.paid_amount) || 0,
    paymentMethod: (row.payment_method as Sale['paymentMethod']) || 'cash',
    note: row.note ? String(row.note) : undefined,
    customerIdNumber: row.customer_id_number ? String(row.customer_id_number) : undefined,
    items_summary: row.items_summary ? String(row.items_summary) : undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }))
}

function mapRow(row: Record<string, unknown>): Client {
  return {
    id: String(row.id),
    name: String(row.name || ''),
    phone: row.phone ? String(row.phone) : undefined,
    idNumber: row.id_number ? String(row.id_number) : undefined,
    isActive: Boolean(row.is_active),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}
