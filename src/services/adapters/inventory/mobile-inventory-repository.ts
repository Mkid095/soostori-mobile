/**
 * MobileInventoryRepository — implements @soostori/inventory.InventoryRepository.
 *
 * Phase 11.3 (Mobile Commerce) — wraps db-inventory-transactions behind the
 * published SDK ledger contract. Mobile-specific cross-cutting
 * (queueSync, audit) lives in db-inventory-transactions; this adapter
 * surfaces only the canonical contract.
 */

import type { UUID } from '@soostori/core'
import type {
  InventoryRepository,
  StockMovement,
  StockBalance,
  StockSummary,
  StockMovementType,
  StockReservation,
  MovementFilter,
  PaginationOptions,
} from '@soostori/inventory'

/* eslint-disable @typescript-eslint/no-explicit-any */

let __testDb: unknown = undefined
export function __setMobileInventoryRepositoryDbForTesting(db: unknown): void {
  __testDb = db
}
async function loadDb(): Promise<unknown> {
  if (__testDb !== undefined) return __testDb
  return await import('../../db-inventory-transactions')
}

function normalizeType(raw: string): StockMovementType {
  const allowed: StockMovementType[] = ['received', 'sold', 'refunded', 'returned', 'adjusted', 'transferred', 'reserved', 'released']
  if ((allowed as string[]).includes(raw)) return raw as StockMovementType
  return 'adjusted'
}

function rowToMovement(row: Record<string, unknown>): StockMovement {
  return {
    id: row.id as UUID,
    shopId: (row.shop_id ?? '') as UUID,
    productId: row.product_id as UUID,
    productVariantId: null,
    type: normalizeType(String(row.event_type ?? 'adjusted')),
    quantity: Number(row.quantity ?? 0),
    balanceAfter: Number(row.balance_after ?? 0),
    referenceId: null,
    referenceType: null,
    reason: row.reason as string | null,
    actorType: 'employee',
    actorId: (row.user_id as UUID) ?? null,
    deviceId: (row.device_id as UUID) ?? ('' as UUID),
    timestamp: String(row.created_at ?? new Date().toISOString()) as never,
    sequence: Number(row.sequence_number ?? 0),
    idempotencyKey: ((row.idempotency_key as string) ?? String(row.id)) as UUID,
    syncedAt: null,
  }
}

export class MobileInventoryRepository implements InventoryRepository {
  // ── Movements ────────────────────────────────────────────────────────────
  async getMovement(id: UUID): Promise<StockMovement | null> {
    const mod = (await loadDb()) as { recordInventoryTransaction?: unknown }
    // recordInventoryTransaction is the helper, not a getter; we use raw
    // query path via a small in-line getter helper if present, else null.
    void mod
    return null // Phase 11.5 will wire a singleMovement getter.
  }

  async listMovements(filter?: MovementFilter, pagination?: PaginationOptions): Promise<StockMovement[]> {
    const mod = (await loadDb()) as {
      getInventoryHistory?: (productId: string) => Promise<Array<Record<string, unknown>>>
      recordInventoryTransaction?: unknown
    }
    void mod; void filter; void pagination
    return []
  }

  async appendMovement(movement: StockMovement): Promise<void> {
    const mod = (await loadDb()) as {
      recordInventoryTransaction?: (entry: Record<string, unknown>) => Promise<unknown>
    }
    if (typeof mod.recordInventoryTransaction === 'function') {
      await mod.recordInventoryTransaction({
        id: movement.id,
        shop_id: movement.shopId,
        product_id: movement.productId,
        device_id: movement.deviceId ?? '',
        user_id: movement.actorId ?? '',
        event_type: movement.type,
        quantity: movement.quantity,
        balance_after: movement.balanceAfter,
        idempotency_key: movement.idempotencyKey,
        sequence_number: movement.sequence,
        reason: movement.reason ?? '',
      })
    }
  }

  async hasMovementByKey(idempotencyKey: UUID): Promise<boolean> {
    const mod = (await loadDb()) as {
      hasMovementByKey?: (k: string) => Promise<boolean>
    }
    if (typeof mod.hasMovementByKey === 'function') {
      return mod.hasMovementByKey(idempotencyKey as string)
    }
    return false
  }

  async getLatestMovement(_productId: UUID): Promise<StockMovement | null> {
    return null // Phase 11.5 will wire a latestMovement getter.
  }

  // ── Stock summaries / balances ───────────────────────────────────────────
  async getStockSummary(_shopId: UUID, _productId: UUID): Promise<StockSummary | null> {
    return null // Phase 11.5 — wire to db-inventory-transactions aggregates.
  }

  async getBalance(_productId: UUID): Promise<StockBalance | null> {
    return null // Phase 11.5 — derive from products.current_stock.
  }

  async upsertBalance(_balance: StockBalance): Promise<void> {
    // Phase 11.5 — write back to products.current_stock via db-products.
  }

  // ── Reservations: defer; Mobile does not maintain a reservation table.
  async createReservation(_r: StockReservation): Promise<void> { /* Phase 11.5 */ }
  async getReservation(_id: UUID): Promise<StockReservation | null> { return null }
  async getReservationsBySale(_saleId: UUID): Promise<StockReservation[]> { return [] }
  async updateReservationStatus(_id: UUID, _status: StockReservation['status']): Promise<void> { /* Phase 11.5 */ }
  async getActiveReservations(_productId: UUID): Promise<StockReservation[]> { return [] }
}

/* eslint-enable @typescript-eslint/no-explicit-any */
