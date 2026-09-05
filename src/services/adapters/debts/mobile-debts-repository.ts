/**
 * MobileDebtsRepository — implements @soostori/debts.DebtsRepository.
 *
 * Phase 11.3 (Mobile Commerce). Wraps db-debts behind the contract.
 */

import type { UUID, ISO8601 } from '@soostori/core'
import type { DebtsRepository, DebtFilter } from '@soostori/debts'
import type { Debt, DebtPayment } from '@soostori/debts'

/* eslint-disable @typescript-eslint/no-explicit-any */

let __testDb: unknown = undefined
export function __setMobileDebtsRepositoryDbForTesting(db: unknown): void {
  __testDb = db
}
async function loadDb(): Promise<unknown> {
  if (__testDb !== undefined) return __testDb
  return await import('../../db-debts')
}

export class MobileDebtsRepository implements DebtsRepository {
  async findById(id: UUID): Promise<Debt | null> {
    const db = (await loadDb()) as { getDebtById: (i: string) => Promise<Debt | null> }
    return db.getDebtById(id as string)
  }

  async findMany(filter?: DebtFilter, pagination?: { limit?: number; offset?: number }): Promise<Debt[]> {
    const db = (await loadDb()) as { getAllDebts: () => Promise<Debt[]>; getDebtsByCustomer: (i: string) => Promise<Debt[]> }
    let rows: Debt[]
    if (filter?.customerId) {
      rows = await db.getDebtsByCustomer(filter.customerId as string)
    } else {
      rows = await db.getAllDebts()
    }
    const start = pagination?.offset ?? 0
    const end = pagination?.limit ? start + pagination.limit : rows.length
    return rows.slice(start, end)
  }

  async create(data: Omit<Debt, 'id' | 'createdAt' | 'updatedAt' | 'amountPaid' | 'status'>): Promise<Debt> {
    const db = (await loadDb()) as { createDebt: (d: unknown) => Promise<Debt> }
    return db.createDebt(data as Parameters<typeof db.createDebt>[0])
  }

  async update(id: UUID, changes: Partial<Debt>): Promise<Debt> {
    // db-debts.ts doesn't have an updateDebt function — stub is no-op for now
    void changes
    const db = (await loadDb()) as { getDebtById: (i: string) => Promise<Debt | null> }
    return (db.getDebtById(id as string) as Promise<Debt | null>).then(d => d as Debt)
  }

  async getTotalOwed(_customerId: UUID): Promise<number> {
    // Mobile tracks total debt collected, not per-customer owed
    return 0
  }

  async getOverdueAsOf(date: ISO8601): Promise<Debt[]> {
    const db = (await loadDb()) as { getAllDebts: () => Promise<Debt[]> }
    const all = await db.getAllDebts()
    return all.filter(d => d.dueDate && d.dueDate < date && d.status !== 'paid')
  }

  async createPayment(data: Omit<DebtPayment, 'id' | 'createdAt'>): Promise<DebtPayment> {
    const db = (await loadDb()) as { recordDebtPayment: (dId: string, amt: number, method: string, ref?: string, notes?: string) => Promise<Debt | null> }
    const debt = await db.recordDebtPayment(data.debtId as string, data.amount, data.paymentMethod, data.reference ?? undefined, data.notes ?? undefined)
    // Return a synthetic DebtPayment — db returns updated Debt, not the payment
    return {
      id: crypto.randomUUID?.() ?? String(Date.now()),
      debtId: data.debtId as string,
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      reference: (data.reference ?? null) as string | null,
      notes: (data.notes ?? null) as string | null,
      createdAt: new Date().toISOString(),
      userId: (data as { userId?: string }).userId as string,
    }
  }

  async listPayments(debtId: UUID): Promise<DebtPayment[]> {
    const db = (await loadDb()) as { getDebtPayments: (i: string) => Promise<DebtPayment[]> }
    return db.getDebtPayments(debtId as string)
  }
}
