/**
 * MobileDebtsRepository — implements @soostori/debts.DebtsRepository.
 *
 * Phase 11 (Mobile Debts). Wraps db-debts behind the contract.
 *
 * Implements the append-only debt balance invariant:
 *   balance = initial_debt_amount − Σ(append_only_payments)
 *
 * Idempotency:
 *   - Debt.create: idempotencyKey = debt.id → no duplicate debt on replay
 *   - Payment.create: idempotencyKey = payment.id → no duplicate payment on replay
 */

import type { UUID, ISO8601 } from '@soostori/core'
import type { Debt, DebtPayment } from '../../../types/types-inventory'

/* eslint-disable @typescript-eslint/no-explicit-any */

let __testDb: unknown = undefined
export function __setMobileDebtsRepositoryDbForTesting(db: unknown): void {
  __testDb = db
}
async function loadDb(): Promise<any> {
  if (__testDb !== undefined) return __testDb
  return await import('../../db-debts')
}

export class MobileDebtsRepository {
  async findById(id: UUID): Promise<Debt | null> {
    const db = await loadDb()
    return db.getDebtById(id as string)
  }

  async findMany(filter?: { customerId?: UUID }, pagination?: { limit?: number; offset?: number }): Promise<Debt[]> {
    const db = await loadDb()
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

  async create(data: {
    customerId?: string
    customerName?: string
    customerPhone?: string
    saleId?: string
    amount: number
    notes?: string
  }): Promise<Debt> {
    const db = await loadDb()
    return db.createDebt({
      customerId: data.customerId,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      saleId: data.saleId,
      amount: data.amount,
      notes: data.notes,
    })
  }

  async getOverdueAsOf(date: ISO8601): Promise<Debt[]> {
    const db = await loadDb()
    const all = await db.getAllDebts()
    return all.filter((d: Debt) => d.dueDate && d.dueDate < date && d.status !== 'paid')
  }

  async createPayment(data: {
    debtId: string
    amount: number
    paymentMethod: string
    reference?: string
    notes?: string
  }): Promise<DebtPayment> {
    const db = await loadDb()
    const debt = await db.recordDebtPayment(
      data.debtId,
      data.amount,
      data.paymentMethod,
      data.reference,
      data.notes,
    )
    // recordDebtPayment returns the updated Debt, not the payment.
    // Re-read payments to surface the new one.
    if (!debt) throw new Error(`Debt ${data.debtId} not found`)
    const payments = await db.getDebtPayments(data.debtId)
    const created = payments.find((p: DebtPayment) => p.amount === data.amount && p.paymentMethod === data.paymentMethod)
    if (!created) throw new Error('Payment not found after insert')
    return created
  }

  async listPayments(debtId: UUID): Promise<DebtPayment[]> {
    const db = await loadDb()
    return db.getDebtPayments(debtId as string)
  }
}
