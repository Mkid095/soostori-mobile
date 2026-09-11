/**
 * contracts-mapper.ts — Mobile SQLite row → @soostori/contracts entity.
 * Cycle 04 Sub-cycle D. Read-side projection; local columns stay (no semantic
 * renames). Missing columns fall back to documented defaults (see audit doc).
 * ≤ 150 lines. No helpers.ts. Per Cycle 04 brief §D.
 */
import {
  asUserId, asEmployeeId, asDeviceId, asInvitationId, asProductId,
  asCategoryId, asCustomerId, asSaleId, asDebtId, asDebtPaymentId,
  asBusinessId, asPersonId, asStockMovementId, asIdempotencyKey, asExpenseId,
} from '@soostori/core'
import type {
  Business, Employee, Device, Invitation, Product, Category,
  StockMovement, StockMovementOperation, Sale, SaleLineItem, Customer,
  Debt, DebtPayment, PaymentMethod, DebtStatus,
} from '@soostori/contracts'
type Row = Record<string, unknown>
const s = (v: unknown): string => v == null ? '' : String(v)
const sn = (v: unknown): string | null => v == null ? null : String(v)
const n = (v: unknown, f = 0): number => { const x = Number(v); return Number.isFinite(x) ? x : f }
const b = (v: unknown): boolean => v === 1 || v === '1' || v === true
const iso = (v: unknown): string => sn(v) ?? new Date().toISOString()
const ver = 1
const opMap: Record<string, StockMovementOperation> = {
  SALE: 'sale', PURCHASE: 'purchase', IN: 'purchase', RETURN: 'return',
  DAMAGE: 'damage', TRANSFER: 'transfer', CORRECTION: 'correction',
  ADJUST: 'correction', OPENING_STOCK: 'openingStock', OPENING: 'openingStock',
}
const op = (v: unknown): StockMovementOperation => opMap[String(v || '').toUpperCase()] ?? 'adjustment'
const pm = (v: unknown): PaymentMethod => {
  const x = String(v || '').toLowerCase()
  if (x === 'mpesa' || x === 'mobile_money') return 'mobile_money'
  if (x === 'card') return 'card'
  if (x === 'transfer' || x === 'bank') return 'transfer'
  if (x === 'debt') return 'debt'
  return 'cash'
}
const ds = (v: unknown): DebtStatus => {
  const x = String(v || '').toLowerCase()
  if (x === 'paid') return 'paid'
  if (x === 'partial') return 'partial'
  if (x === 'overdue') return 'overdue'
  if (x === 'written_off') return 'written_off'
  return 'pending'
}
const ts = (r: Row) => iso(r.timestamp ?? r.created_at)
const tsSale = (sale?: Row, r?: Row) => iso(sale?.updated_at ?? sale?.created_at ?? r?.updated_at ?? r?.created_at)
export function fromLocalBusiness(r: Row): Business {
  return { id: asBusinessId(s(r.id)), name: sn(r.name) ?? '', slug: sn(r.slug) ?? '',
    taxRate: n(r.tax_rate), plan: sn(r.plan) ?? 'unknown',
    subscriptionExpiry: sn(r.subscription_expiry), status: 'active',
    currency: sn(r.currency) ?? 'KES', ownerPersonId: asPersonId(s(r.cloud_owner_id)),
    createdAt: iso(r.created_at), updatedAt: iso(r.updated_at ?? r.created_at), version: ver } }
export function fromLocalEmployee(r: Row): Employee {
  return { id: asEmployeeId(s(r.id)), businessId: asBusinessId(s(r.shop_id)),
    name: sn(r.name) ?? '', email: sn(r.email), phone: sn(r.phone),
    role: (sn(r.role) ?? 'attendant') as Employee['role'], permissions: null,
    cloudId: sn(r.cloud_employee_id) ?? '', status: b(r.is_active) ? 'active' : 'inactive',
    createdBy: null, invitedBy: null, createdAt: iso(r.created_at),
    updatedAt: iso(r.updated_at ?? r.created_at), version: ver } }
export function fromLocalDevice(r: Row): Device {
  return { id: asDeviceId(s(r.id)), businessId: asBusinessId(s(r.shop_id)),
    deviceName: sn(r.device_name) ?? '',
    deviceType: (sn(r.device_type) ?? 'mobile') as Device['deviceType'],
    status: b(r.cloud_registered) ? 'authorized' : 'pending',
    isLanHost: b(r.is_host), hasPin: false, pinSetupAt: null,
    authorizedAt: sn(r.cloud_registered_at), lastSeenAt: sn(r.last_seen),
    createdAt: iso(r.created_at), updatedAt: iso(r.created_at), version: ver } }
export function fromLocalInvitation(r: Row): Invitation {
  return { id: asInvitationId(s(r.id)), businessId: asBusinessId(s(r.shop_id)),
    email: sn(r.email), phone: sn(r.phone),
    employeeRole: (sn(r.employee_role) ?? 'attendant') as Invitation['employeeRole'],
    code: sn(r.code) ?? '', status: r.used_at == null ? 'pending' : 'accepted',
    expiresAt: iso(r.expires_at), createdBy: null, usedAt: sn(r.used_at),
    createdAt: iso(r.created_at), version: ver } }
export function fromLocalProduct(r: Row): Product {
  return { id: asProductId(s(r.id)), businessId: asBusinessId(s(r.shop_id)),
    name: sn(r.name) ?? '', barcode: sn(r.barcode), sku: sn(r.sku),
    categoryId: r.category_id ? asCategoryId(String(r.category_id)) : null,
    description: null, costPrice: n(r.cost_price), sellingPrice: n(r.selling_price),
    groupPrices: r.group_prices ? JSON.parse(String(r.group_prices)) : null,
    isGroup: false, unitsPerPackage: n(r.units_per_package, 1),
    stockQuantity: n(r.stock_quantity ?? r.current_stock),
    currentStock: n(r.current_stock ?? r.stock_quantity),
    lowStockThreshold: n(r.low_stock_threshold),
    trackInventory: b(r.track_inventory ?? true),
    allowSingleUnitSale: b(r.allow_single_unit_sale ?? true),
    distributorName: sn(r.distributor_name), distributorPhone: sn(r.distributor_phone),
    image: sn(r.image_url), isActive: b(r.is_active ?? true),
    createdAt: iso(r.created_at), updatedAt: iso(r.updated_at ?? r.created_at), version: ver } }
export function fromLocalCategory(r: Row): Category {
  return { id: asCategoryId(s(r.id)), businessId: asBusinessId(s(r.businessId)),
    name: sn(r.name) ?? '', color: sn(r.color) ?? '#f97316', description: sn(r.description),
    isActive: b(r.is_active ?? true), createdAt: iso(r.created_at),
    updatedAt: iso(r.updated_at ?? r.created_at), version: ver } }
export function fromLocalStockMovement(r: Row): StockMovement {
  return { id: asStockMovementId(s(r.id)), businessId: asBusinessId(s(r.shop_id)),
    productId: asProductId(s(r.product_id)), quantity: n(r.quantity),
    operation: op(r.type), deviceId: asDeviceId(s(r.device_id)),
    userId: asUserId(s(r.created_by)),
    idempotencyKey: asIdempotencyKey(s(r.reference_id ?? r.id)),
    timestamp: ts(r), notes: sn(r.reason), createdAt: ts(r), version: ver } }
export function fromLocalSale(r: Row): Sale {
  let items: SaleLineItem[] = []
  try { items = JSON.parse(String(r.items || '[]')) } catch {}
  return { id: asSaleId(s(r.id)), businessId: asBusinessId(s(r.shop_id)),
    type: (sn(r.type) ?? 'retail') as Sale['type'],
    status: (sn(r.status) ?? 'completed') as Sale['status'],
    subtotal: n(r.subtotal), discountAmount: n(r.discount_amount), taxAmount: 0,
    totalAmount: n(r.total_amount), paidAmount: n(r.paid_amount),
    paymentMethod: pm(r.payment_method), note: sn(r.note),
    customerId: r.customer_id ? asCustomerId(String(r.customer_id)) : null,
    employeeId: asEmployeeId(s(r.employee_id)), deviceId: asDeviceId(s(r.device_id)),
    idempotencyKey: asIdempotencyKey(s(r.id)), items,
    createdAt: iso(r.created_at), updatedAt: iso(r.updated_at ?? r.created_at),
    confirmedAt: iso(r.created_at), version: ver } }
export function fromLocalSaleLineItem(r: Row, sale?: Row): SaleLineItem {
  return { id: asSaleId(s(r.id)) as unknown as SaleLineItem['id'],
    saleId: asSaleId(s(r.sale_id)),
    businessId: asBusinessId(s(sale?.shop_id ?? r.businessId)),
    productId: asProductId(s(r.product_id)),
    productName: sn(r.product_name) ?? '', variationName: sn(r.variation_name),
    quantity: n(r.quantity, 1), unitPrice: n(r.unit_price), discount: n(r.discount),
    totalPrice: n(r.total_price), createdAt: tsSale(sale, r),
    updatedAt: tsSale(sale, r), version: ver } }export function fromLocalCustomer(r: Row): Customer {
  return { id: asCustomerId(s(r.id)), businessId: asBusinessId(s(r.businessId)),
    name: sn(r.name) ?? '', phone: sn(r.phone), email: sn(r.email),
    idNumber: sn(r.id_number), address: sn(r.address), notes: sn(r.notes),
    balance: n(r.balance), status: b(r.is_active) ? 'active' : 'inactive',
    createdAt: iso(r.created_at), updatedAt: iso(r.updated_at ?? r.created_at), version: ver } }
export function fromLocalDebt(r: Row): Debt {
  const amount = n(r.amount), paid = n(r.amount_paid)
  return { id: asDebtId(s(r.id)), businessId: asBusinessId(s(r.businessId)),
    customerId: asCustomerId(s(r.customer_id)),
    saleId: r.sale_id ? asSaleId(String(r.sale_id)) : null,
    amount, balance: Math.max(0, amount - paid), status: ds(r.status),
    dueDate: sn(r.due_date), notes: sn(r.notes), createdAt: iso(r.created_at),
    updatedAt: iso(r.updated_at ?? r.created_at), version: ver } }
export function fromLocalDebtPayment(r: Row): DebtPayment {
  return { id: asDebtPaymentId(s(r.id)), businessId: asBusinessId(s(r.businessId)),
    debtId: asDebtId(s(r.debt_id)), amount: n(r.amount),
    employeeId: asEmployeeId(s(r.employee_id)),
    paymentMethod: pm(r.payment_method) as DebtPayment['paymentMethod'],
    paymentRef: sn(r.reference), idempotencyKey: asIdempotencyKey(s(r.id)),
    timestamp: iso(r.created_at), createdAt: iso(r.created_at),
    updatedAt: iso(r.created_at), version: ver } }export function fromLocalExpense(r: Row, categoryName?: string): any {
  const entity = {
    id: asExpenseId(s(r.id)), businessId: asBusinessId(s(r.businessId)),
    categoryName: categoryName ?? sn(r.category_name) ?? '', amount: n(r.amount),
    employeeId: asEmployeeId(s(r.employee_id)),
    note: sn(r.description ?? r.note), date: sn(r.date) ?? '', reference: sn(r.reference),
    createdAt: iso(r.created_at), updatedAt: iso(r.updated_at ?? r.created_at), version: ver,
    status: String(r.status || 'pending') as 'pending' | 'approved' | 'paid',
    paidAt: sn(r.paid_at) ?? undefined,
    vendor: sn(r.vendor) ?? undefined,
    createdBy: sn(r.created_by) ?? undefined,
  }
  return entity
}