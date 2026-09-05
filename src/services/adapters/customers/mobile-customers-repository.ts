/**
 * MobileCustomersRepository — implements @soostori/customers.CustomersRepository.
 *
 * Phase 11.3 (Mobile Commerce). Wraps db-customers behind the contract.
 */

import type { UUID } from '@soostori/core'
import type { CustomersRepository, CustomerFilter, PaginationOptions } from '@soostori/customers'
import type { Customer, CustomerRiskFlag } from '@soostori/customers'

/* eslint-disable @typescript-eslint/no-explicit-any */

let __testDb: unknown = undefined
export function __setMobileCustomersRepositoryDbForTesting(db: unknown): void {
  __testDb = db
}
async function loadDb(): Promise<unknown> {
  if (__testDb !== undefined) return __testDb
  return await import('../../db-customers')
}

export class MobileCustomersRepository implements CustomersRepository {
  async findById(id: UUID): Promise<Customer | null> {
    const db = (await loadDb()) as { getCustomerById: (i: string) => Promise<Customer | null> }
    return db.getCustomerById(id as string)
  }

  async findMany(filter?: CustomerFilter, pagination?: PaginationOptions): Promise<Customer[]> {
    const db = (await loadDb()) as {
      getAllCustomers: () => Promise<Customer[]>
      searchCustomers: (q: string) => Promise<Customer[]>
    }
    if (filter?.search) {
      return db.searchCustomers(filter.search)
    }
    const rows = await db.getAllCustomers()
    const start = pagination?.offset ?? 0
    const end = pagination?.limit ? start + pagination.limit : rows.length
    return rows.slice(start, end)
  }

  async create(data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): Promise<Customer> {
    const db = (await loadDb()) as { createCustomer: (d: unknown) => Promise<Customer> }
    return db.createCustomer(data)
  }

  async update(id: UUID, changes: Partial<Customer>): Promise<Customer> {
    const db = (await loadDb()) as { updateCustomer: (i: string, c: unknown) => Promise<Customer> }
    return db.updateCustomer(id as string, changes)
  }

  async softDelete(id: UUID): Promise<void> {
    const db = (await loadDb()) as { deactivateCustomer: (i: string) => Promise<void> }
    await db.deactivateCustomer(id as string)
  }

  async findByPhone(_shopId: UUID, phone: string): Promise<Customer | null> {
    const db = (await loadDb()) as { getAllCustomers: () => Promise<Customer[]> }
    const all = await db.getAllCustomers()
    return all.find(c => c.phone === phone) ?? null
  }

  async getOutstandingDebt(_id: UUID): Promise<number> {
    // Mobile doesn't track per-customer debt total via the repo pattern yet.
    // Stub returns 0; the debt screen uses db-debts directly.
    return 0
  }

  async findFlags(_customerId: UUID): Promise<CustomerRiskFlag[]> {
    return [] // Mobile doesn't use risk flags yet
  }

  async createFlag(_data: Omit<CustomerRiskFlag, 'id' | 'flaggedAt' | 'clearedAt'>): Promise<CustomerRiskFlag> {
    throw new Error('Risk flags not implemented on mobile')
  }

  async clearFlag(_flagId: UUID): Promise<void> {
    // no-op on mobile
  }
}
