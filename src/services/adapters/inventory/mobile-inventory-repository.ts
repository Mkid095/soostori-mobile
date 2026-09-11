/**
 * MobileInventoryRepository — implements @soostori/inventory.InventoryRepository.
 *
 * Phase 09 — Full offline sale transaction:
 *   Cart → Sale → SaleItems → inventory deduction via stock ledger
 *   → idempotent sync event → replay-safe.
 *
 * File split:
 *   inventory-movement-repo.ts  — movement read/write + rowToMovement
 *   inventory-balance-repo.ts   — balance cache + summary
 *   inventory-reservation-repo.ts (inline below) — reservation CRUD
 */

import type { UUID, ISO8601 } from '@soostori/core'
import type {
  InventoryRepository, StockMovement, StockBalance,
  StockSummary, StockReservation, MovementFilter, PaginationOptions,
} from '@soostori/inventory'
import { getStockBalance, upsertStockBalance, getStockSummary } from './inventory-balance-repo'
import { getMovement, listMovements, appendMovement, hasMovementByKey, getLatestMovement } from './inventory-movement-repo'

/* eslint-disable @typescript-eslint/no-explicit-any */

// ── Reservation helpers (inline to avoid another file) ────────────────────────

async function createReservation(r: StockReservation): Promise<void> {
  const { getDb } = await import('../../../lib/db')
  const db = await getDb()
  await db.runAsync(
    `INSERT OR REPLACE INTO stock_reservations
       (id, sale_id, product_id, quantity, status, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [r.id, r.saleId, r.productId, r.quantity, r.status, r.expiresAt, r.createdAt],
  )
}

async function getReservation(id: UUID): Promise<StockReservation | null> {
  const { getDb } = await import('../../../lib/db')
  const db = await getDb()
  const row = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM stock_reservations WHERE id = ?', [id],
  )
  if (!row) return null
  return {
    id: row.id as UUID, saleId: row.sale_id as UUID, productId: row.product_id as UUID,
    quantity: Number(row.quantity),
    status: (row.status as StockReservation['status']) ?? 'active',
    expiresAt: String(row.expires_at) as ISO8601, createdAt: String(row.created_at) as ISO8601,
  }
}

async function getReservationsBySale(saleId: UUID): Promise<StockReservation[]> {
  const { getDb } = await import('../../../lib/db')
  const db = await getDb()
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM stock_reservations WHERE sale_id = ?', [saleId],
  )
  return rows.map(row => ({
    id: row.id as UUID, saleId: row.sale_id as UUID, productId: row.product_id as UUID,
    quantity: Number(row.quantity),
    status: (row.status as StockReservation['status']) ?? 'active',
    expiresAt: String(row.expires_at) as ISO8601, createdAt: String(row.created_at) as ISO8601,
  }))
}

// ── MobileInventoryRepository ─────────────────────────────────────────────────

export class MobileInventoryRepository implements InventoryRepository {
  async getMovement(id: UUID)                  { return getMovement(id) }
  async listMovements(f?: MovementFilter, p?: PaginationOptions) { return listMovements(f, p) }
  async appendMovement(m: StockMovement)       { return appendMovement(m) }
  async hasMovementByKey(k: UUID)              { return hasMovementByKey(k) }
  async getLatestMovement(p: UUID)              { return getLatestMovement(p) }
  async getStockSummary(s: UUID, p: UUID)      { return getStockSummary(s, p) }
  async getBalance(p: UUID)                    { return getStockBalance(p) }
  async upsertBalance(b: StockBalance)         { return upsertStockBalance(b.productId, b.shopId, b.quantity, b.reservedQuantity, b.lastSequence) }
  async createReservation(r: StockReservation) { return createReservation(r) }
  async getReservation(id: UUID)               { return getReservation(id) }
  async getReservationsBySale(s: UUID)         { return getReservationsBySale(s) }

  async updateReservationStatus(id: UUID, status: StockReservation['status']): Promise<void> {
    const { getDb } = await import('../../../lib/db')
    const db = await getDb()
    await db.runAsync('UPDATE stock_reservations SET status = ? WHERE id = ?', [status, id])
  }

  async getActiveReservations(productId: UUID): Promise<StockReservation[]> {
    const { getDb } = await import('../../../lib/db')
    const db = await getDb()
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM stock_reservations WHERE product_id = ? AND status = 'active' AND expires_at > ?`,
      [productId, new Date().toISOString()],
    )
    return rows.map(row => ({
      id: row.id as UUID, saleId: row.sale_id as UUID, productId: row.product_id as UUID,
      quantity: Number(row.quantity),
      status: (row.status as StockReservation['status']) ?? 'active',
      expiresAt: String(row.expires_at) as ISO8601, createdAt: String(row.created_at) as ISO8601,
    }))
  }
}

/* eslint-enable @typescript-eslint/no-explicit-any */
