// customers-service.ts — Phase 19: customer detail aggregation
import { getDb } from '../lib/db'
import type { Customer } from '../lib/types'
import { mapCustomerRow } from './db-customers-mapper'
import { mapCustomerSaleRow } from './db-customers-mapper'

export interface CustomerDetail {
  customer: Customer | null
  sales: CustomerPurchase[]
  debts: DebtEntry[]
  payments: DebtPaymentEntry[]
}

export interface CustomerPurchase {
  id: string
  totalAmount: number
  paymentMethod: string
  createdAt: string
  itemsSummary: string | undefined
}

export interface DebtEntry {
  id: string
  amount: number
  status: string
  dueDate: string | null
}

export interface DebtPaymentEntry {
  id: string
  debtId: string
  amount: number
  paidAt: string
}

/**
 * getCustomerDetail — aggregates customer + sales + debts + payments.
 */
export async function getCustomerDetail(customerId: string): Promise<CustomerDetail> {
  const db = await getDb()

  const [customerRow, salesRows, debtRows] = await Promise.all([
    db.getFirstAsync<Record<string, unknown>>(
      'SELECT * FROM customers WHERE id = ?',
      [customerId],
    ),
    db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM sales
       WHERE customer_id_number = ? AND status = 'completed'
       ORDER BY created_at DESC LIMIT 20`,
      [customerId],
    ),
    db.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM debts WHERE customer_id_number = ? ORDER BY created_at DESC',
      [customerId],
    ),
  ])

  const customer = customerRow ? mapCustomerRow(customerRow) : null

  const sales: CustomerPurchase[] = salesRows.map(row => ({
    id: String(row.id),
    totalAmount: Number(row.total_amount) || 0,
    paymentMethod: String(row.payment_method || 'cash'),
    createdAt: String(row.created_at),
    itemsSummary: row.items_summary ? String(row.items_summary) : undefined,
  }))

  const debts: DebtEntry[] = debtRows.map(row => ({
    id: String(row.id),
    amount: Number(row.amount) || 0,
    status: String(row.status),
    dueDate: row.due_date ? String(row.due_date) : null,
  }))

  // Gather all debt IDs and fetch payments
  const debtIds = debts.map(d => d.id)
  let payments: DebtPaymentEntry[] = []
  if (debtIds.length > 0) {
    const placeholders = debtIds.map(() => '?').join(',')
    const paymentRows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM debt_payments WHERE debt_id IN (${placeholders}) ORDER BY created_at ASC`,
      debtIds,
    )
    payments = paymentRows.map(row => ({
      id: String(row.id),
      debtId: String(row.debt_id),
      amount: Number(row.amount) || 0,
      paidAt: String(row.created_at),
    }))
  }

  return { customer, sales, debts, payments }
}
