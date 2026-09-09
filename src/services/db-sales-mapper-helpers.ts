// db-sales-mapper-helpers.ts — Helper functions for mapping sale rows
import type { Sale, SaleItem } from '../lib/types'

export function mapSaleItemRow(item: Record<string, unknown>): SaleItem {
  return {
    id: String(item.id),
    saleId: String(item.sale_id),
    productId: item.product_id ? String(item.product_id) : undefined,
    variationName: item.variation_name ? String(item.variation_name) : undefined,
    productName: String(item.product_name),
    quantity: Number(item.quantity) || 0,
    unitPrice: Number(item.unit_price) || 0,
    discount: Number(item.discount) || 0,
    totalPrice: Number(item.total_price) || 0,
  }
}

export function mapPendingSaleRow(r: Record<string, unknown>): Sale {
  return {
    id: String(r.id),
    shopId: String(r.shop_id),
    employeeId: String(r.employee_id),
    deviceId: String(r.device_id),
    status: 'pending' as const,
    paymentMethod: r.payment_method ? String(r.payment_method) : undefined,
    subtotal: Number(r.subtotal),
    discountAmount: Number(r.discount_amount),
    totalAmount: Number(r.total_amount),
    paidAmount: Number(r.paid_amount) || 0,
    customerIdNumber: r.customer_id_number ? String(r.customer_id_number) : undefined,
    note: r.note ? String(r.note) : undefined,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  } as unknown as Sale
}
