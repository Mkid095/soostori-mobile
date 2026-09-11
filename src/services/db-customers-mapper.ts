// db-customers-mapper.ts — Row mappers for customer entities
import type { Customer, Sale } from '../lib/types'

type Row = Record<string, unknown>

export function mapCustomerRow(row: Row): Customer {
  return {
    id: String(row.id),
    name: String(row.name || ''),
    phone: row.phone ? String(row.phone) : undefined,
    idNumber: row.id_number ? String(row.id_number) : undefined,
    isActive: Boolean(row.is_active),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

export function mapCustomerSaleRow(row: Row): Sale {
  return {
    id: String(row.id),
    type: (row.type as Sale['type']) || 'retail',
    status: (row.status as Sale['status']) || 'completed',
    subtotal: Number(row.subtotal) || 0,
    discountAmount: Number(row.discount_amount) || 0,
    totalAmount: Number(row.total_amount) || 0,
    paidAmount: Number(row.paid_amount) || 0,
    paymentMethod: (row.payment_method as Sale['paymentMethod']) || 'cash',
    note: row.note ? String(row.note) : undefined,
    customerIdNumber: row.customer_id_number ? String(row.customer_id_number) : undefined,
    items_summary: row.items_summary ? String(row.items_summary) : undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}
