// Shop CRUD — desktop-agent
import { getDb } from '../lib/db'
import type { Shop } from '../lib/sync-protocol'
import { generateId } from '../lib/formatters'

export async function getShop(id: string): Promise<Shop | null> {
  const db = await getDb()
  const row = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM shops WHERE id = ?', [id]
  )
  if (!row) return null
  return {
    id: String(row.id),
    name: String(row.name),
    createdAt: String(row.created_at),
  }
}

export async function getDefaultShop(): Promise<Shop> {
  const shop = await getShop('shop-default')
  if (shop) return shop
  const db = await getDb()
  const id = generateId()
  const now = new Date().toISOString()
  await db.runAsync(
    'INSERT INTO shops (id, name, created_at) VALUES (?, ?, ?)',
    [id, 'My Shop', now]
  )
  return { id, name: 'My Shop', createdAt: now }
}

export async function updateShopName(id: string, name: string): Promise<void> {
  const db = await getDb()
  await db.runAsync('UPDATE shops SET name = ? WHERE id = ?', [name, id])
}
