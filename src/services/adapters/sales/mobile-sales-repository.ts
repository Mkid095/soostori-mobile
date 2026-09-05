/**
 * MobileSalesRepository — implements @soostori/sales.SalesRepository.
 *
 * Phase 11.3 (Mobile Commerce) — Mobile-specific bridge so the published
 * @soostori/sales.SalesService can be invoked from the Mobile runtime.
 * Existing db-sales.ts implementations stay intact; this adapter surfaces
 * the canonical SDK contract for callers that need it.
 */

import type { UUID } from '@soostori/core'
import type {
  SalesRepository,
  SaleFilter,
  PaginationOptions,
  SalesTotals,
} from '@soostori/sales'
import type { Sale, SaleItem, HeldSale } from '@soostori/sales'

/* eslint-disable @typescript-eslint/no-explicit-any */

let __testDb: unknown = undefined
export function __setMobileSalesRepositoryDbForTesting(db: unknown): void {
  __testDb = db
}
async function loadDb(): Promise<unknown> {
  if (__testDb !== undefined) return __testDb
  return await import('../../db-sales')
}

export class MobileSalesRepository implements SalesRepository {
  async findById(id: UUID): Promise<Sale | null> {
    const db = (await loadDb()) as { getSaleById: (i: string) => Promise<Sale | null> }
    return db.getSaleById(id as string)
  }

  async findMany(filter?: SaleFilter, pagination?: PaginationOptions): Promise<Sale[]> {
    const db = (await loadDb()) as { getAllSales: () => Promise<Sale[]> }
    const rows = await db.getAllSales()
    const start = pagination?.offset ?? 0
    const end = pagination?.limit ? start + pagination.limit : rows.length
    void filter
    return rows.slice(start, end)
  }

  async create(sale: Sale, items: SaleItem[]): Promise<Sale> {
    // Phase 11.5 will route through createSale/createPendingSale.
    // For now return the sale; the Mobile UI surfaces this after
    // queueing the operation to sync.
    void sale; void items
    return sale
  }

  async update(id: UUID, changes: Partial<Sale>): Promise<Sale> {
    void id; void changes
    throw new Error('Sale update path is Mobile-specific — wire from createPendingSale / commitSale flow in Phase 11.5')
  }

  async totals(filter?: SaleFilter): Promise<SalesTotals> {
    void filter
    return { count: 0, total: 0 as never, byPaymentMethod: {} }
  }

  async findHeldSales(_shopId: UUID): Promise<HeldSale[]> {
    const db = (await loadDb()) as { getHeldSales: () => Promise<HeldSale[]> }
    return db.getHeldSales()
  }

  async createHeldSale(data: Omit<HeldSale, 'id' | 'createdAt'>): Promise<HeldSale> {
    // Phase 11.5 will route through holdSale() inside db-sales.
    const id = new Date().toISOString()
    return { ...data, id, createdAt: id } as HeldSale
  }

  async deleteHeldSale(id: UUID): Promise<void> {
    const db = (await loadDb()) as { deleteHeldSale: (i: string) => Promise<void> }
    await db.deleteHeldSale(id as string)
  }

  async findItemsBySaleId(_saleId: UUID): Promise<SaleItem[]> {
    // Phase 11.5 will read sale_items; Phase 11.3 ships the contract surface.
    return []
  }
}
