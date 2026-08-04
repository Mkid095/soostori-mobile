// Sale row mapper — converts DB rows to Sale objects

import type { Sale } from '../lib/types'

export function mapSaleRow(row: Record<string, unknown>): Sale {
  return {
    id: String(row.id),
    type: String(row.type || 'retail') as Sale['type'],
    status: String(row.status || 'completed') as Sale['status'],
    subtotal: Number(row.subtotal) || 0,
    discountAmount: Number(row.discount_amount) || 0,
    totalAmount: Number(row.total_amount) || 0,
    paidAmount: Number(row.paid_amount) || 0,
    paymentMethod: String(row.payment_method) as Sale['paymentMethod'],
    note: row.note ? String(row.note) : undefined,
    customerIdNumber: row.customer_id_number ? String(row.customer_id_number) : undefined,
    items_summary: row.items_summary ? String(row.items_summary) : undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}
