// Customer CRUD operations — business logic in services, NOT components

import { getDb } from '../lib/db'
import type { Customer } from '../lib/types'
import { generateId } from '../lib/utils'
import { queueSync } from './sync-queue-helper'

export async function searchCustomers(query: string): Promise<Customer[]> {
  const db = await getDb()
  const q = `%${query}%`
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM customers WHERE is_active = 1 AND (name LIKE ? OR phone LIKE ?) ORDER BY name ASC LIMIT 20',
    [q, q]
  )
  return rows.map(mapRow)
}

export async function getAllCustomers(): Promise<Customer[]> {
  const db = await getDb()
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM customers WHERE is_active = 1 ORDER BY name ASC LIMIT 500'
  )
  return rows.map(mapRow)
}

export async function getCustomerById(id: string): Promise<Customer | null> {
  const db = await getDb()
  const row = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM customers WHERE id = ?', [id]
  )
  return row ? mapRow(row) : null
}

export async function createCustomer(data: {
  name: string
  phone?: string
  idNumber?: string
}): Promise<Customer> {
  const db = await getDb()
  const id = generateId()
  const now = new Date().toISOString()
  await db.runAsync(
    `INSERT INTO customers (id, name, phone, id_number, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, 1, ?, ?)`,
    [id, data.name, data.phone || null, data.idNumber || null, now, now]
  )
  await queueSync('customers', 'create', id)
  return (await getCustomerById(id))!
}

export async function updateCustomer(
  id: string,
  data: { name?: string; phone?: string; idNumber?: string }
): Promise<Customer | null> {
  const db = await getDb()
  const now = new Date().toISOString()
  const fields: string[] = []
  const values: (string | number | null)[] = []
  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name) }
  if (data.phone !== undefined) { fields.push('phone = ?'); values.push(data.phone ?? null) }
  if (data.idNumber !== undefined) { fields.push('id_number = ?'); values.push(data.idNumber ?? null) }
  if (fields.length === 0) return getCustomerById(id)
  fields.push('updated_at = ?')
  values.push(now)
  values.push(id)
  await db.runAsync(`UPDATE customers SET ${fields.join(', ')} WHERE id = ?`, values)
  await queueSync('customers', 'update', id)
  return getCustomerById(id)
}

export async function deactivateCustomer(id: string): Promise<void> {
  const db = await getDb()
  const now = new Date().toISOString()
  await db.runAsync(
    'UPDATE customers SET is_active = 0, updated_at = ? WHERE id = ?',
    [now, id]
  )
  await queueSync('customers', 'update', id)
}

function mapRow(row: Record<string, unknown>): Customer {
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
