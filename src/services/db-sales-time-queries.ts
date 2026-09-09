// db-sales-time-queries.ts — Time-based sale queries
import { getDb } from '../lib/db'
import type { Sale } from '../lib/types'
import { mapSaleRow } from './db-sales-mapper'

export async function getTodaySales(): Promise<Sale[]> {
  const db = await getDb()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM sales WHERE created_at >= ? ORDER BY created_at DESC',
    [today.toISOString()],
  )
  return rows.map(mapSaleRow)
}

export async function getWeekSales(): Promise<Sale[]> {
  const db = await getDb()
  const date = new Date()
  date.setDate(date.getDate() - 7)
  date.setHours(0, 0, 0, 0)
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM sales WHERE created_at >= ? ORDER BY created_at DESC',
    [date.toISOString()],
  )
  return rows.map(mapSaleRow)
}

export async function getMonthSales(): Promise<Sale[]> {
  const db = await getDb()
  const date = new Date()
  date.setMonth(date.getMonth() - 1)
  date.setHours(0, 0, 0, 0)
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM sales WHERE created_at >= ? ORDER BY created_at DESC',
    [date.toISOString()],
  )
  return rows.map(mapSaleRow)
}

export async function getAllSales(): Promise<Sale[]> {
  const db = await getDb()
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM sales ORDER BY created_at DESC LIMIT 200',
  )
  return rows.map(mapSaleRow)
}
