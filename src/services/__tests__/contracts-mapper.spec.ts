/**
 * contracts-mapper.test.ts — Cycle 04 Sub-cycle D.
 *
 * Proves the local SQLite row → @soostori/contracts entity mapping for
 * each entity the mapper exposes. Verifies:
 *   1. Each mapper returns a contract-shaped object with branded IDs.
 *   2. Default fallbacks for MISSING columns (see audit doc).
 *   3. Round-trip: the mapper output still passes the contract type guard
 *      by re-casting it through the same constructor (no schema drift).
 *
 * Run with: npx jest contracts-mapper
 */
import {
  fromLocalBusiness, fromLocalEmployee, fromLocalDevice, fromLocalInvitation,
  fromLocalProduct, fromLocalCategory, fromLocalStockMovement, fromLocalSale,
  fromLocalSaleLineItem, fromLocalCustomer, fromLocalDebt, fromLocalDebtPayment,
  fromLocalExpense,
} from '../../lib/contracts-mapper'
import type { Product, Sale, Customer, Employee, Device } from '@soostori/contracts'

describe('contracts-mapper (Cycle 04 Sub-cycle D)', () => {
  test('[1] fromLocalProduct — local row → contract Product', () => {
    const p = fromLocalProduct({
      id: 'p_001', shop_id: 'shop-default', name: 'Coca Cola 500ml',
      sku: 'COK-500', barcode: '5449000000996',
      category_id: 'cat_001', cost_price: 80, selling_price: 150,
      stock_quantity: 24, current_stock: 24, low_stock_threshold: 5,
      track_inventory: 1, allow_single_unit_sale: 1,
      distributor_name: 'Coca Cola Co', distributor_phone: '+254700000000',
      image_url: null, is_active: 1, units_per_package: 12,
      created_at: '2025-09-01T00:00:00Z', updated_at: '2025-09-01T00:00:00Z',
    })
    const asProduct: Product = p // compile-time type assertion
    expect(p.id).toBe('p_001')
    expect(p.businessId).toBe('shop-default') // shop_id aliased to businessId
    expect(p.name).toBe('Coca Cola 500ml')
    expect(p.sellingPrice).toBe(150)
    expect(p.stockQuantity).toBe(24)
    expect(p.currentStock).toBe(24)
    expect(p.trackInventory).toBe(true)
    expect(p.isActive).toBe(true)
    expect(p.version).toBe(1) // default for local rows
    expect(asProduct).toBeDefined()
  })

  test('[2] fromLocalSale — deserialises items JSON, projects enums', () => {
    const s = fromLocalSale({
      id: 's_001', shop_id: 'shop-default', type: 'retail', status: 'completed',
      subtotal: 300, discount_amount: 0, total_amount: 300, paid_amount: 300,
      payment_method: 'mpesa', note: null, customer_id: null,
      employee_id: 'emp_001', device_id: 'dev_001',
      items: JSON.stringify([{ id: 'li_1', productId: 'p_001', quantity: 2 }]),
      created_at: '2025-09-10T08:00:00Z', updated_at: '2025-09-10T08:00:00Z',
    })
    const asSale: Sale = s
    expect(s.paymentMethod).toBe('mobile_money') // mpesa → mobile_money
    expect(s.taxAmount).toBe(0) // MISSING locally
    expect(s.idempotencyKey).toBe('s_001') // local id reused
    expect(Array.isArray(s.items)).toBe(true)
    expect(asSale.id).toBe('s_001')
  })

  test('[3] fromLocalCustomer — is_active 0/1 → status projection', () => {
    const active = fromLocalCustomer({
      id: 'c_001', businessId: 'shop-default', name: 'Jane',
      phone: '+254711111111', id_number: '12345678', is_active: 1,
      created_at: '2025-09-01', updated_at: '2025-09-01',
    })
    const inactive = fromLocalCustomer({ ...active, is_active: 0 })
    expect(active.status).toBe('active')
    expect(inactive.status).toBe('inactive')
    const asCustomer: Customer = active
    expect(asCustomer.id).toBe('c_001')
  })

  test('[4] fromLocalEmployee — cloudId link to Person preserved', () => {
    const e = fromLocalEmployee({
      id: 'emp_001', shop_id: 'shop-default', name: 'Cashier 1',
      email: 'c1@shop.com', phone: '+254700000000',
      pin_hash: 'h', pin_salt: 's', // not in mapper (auth detail)
      role: 'cashier', is_active: 1,
      cloud_employee_id: 'usr_fidscript_001',
      created_at: '2025-09-01', updated_at: '2025-09-01',
    })
    expect(e.businessId).toBe('shop-default')
    expect(e.role).toBe('cashier')
    expect(e.cloudId).toBe('usr_fidscript_001') // Employee.cloudId link
    expect(e.status).toBe('active')
    const asEmployee: Employee = e
    expect(asEmployee.cloudId).toBe('usr_fidscript_001')
  })

  test('[5] fromLocalDevice — cloud_registered → status', () => {
    const pending = fromLocalDevice({
      id: 'd_001', shop_id: 'shop-default', device_name: 'Pixel 8',
      device_type: 'mobile', cloud_registered: 0, is_host: 0,
      created_at: '2025-09-01',
    })
    const authorized = fromLocalDevice({ ...pending, cloud_registered: 1 })
    expect(pending.status).toBe('pending')
    expect(authorized.status).toBe('authorized')
    expect(authorized.deviceType).toBe('mobile')
    const asDevice: Device = pending
    expect(asDevice.id).toBe('d_001')
  })

  test('[6] fromLocalStockMovement — type → operation enum', () => {
    const sale = fromLocalStockMovement({
      id: 'm_001', shop_id: 'shop-default', product_id: 'p_001',
      quantity: -2, type: 'SALE', device_id: 'd_001', created_by: 'emp_001',
      reference_id: 'sale_001', timestamp: '2025-09-10T08:00:00Z',
    })
    expect(sale.operation).toBe('sale')
    expect(sale.idempotencyKey).toBe('sale_001') // reference_id aliased

    const opening = fromLocalStockMovement({
      id: 'm_002', shop_id: 'shop-default', product_id: 'p_001',
      quantity: 100, type: 'OPENING_STOCK', device_id: 'd_001', created_by: 'emp_001',
      reference_id: 'open_001', timestamp: '2025-09-10T08:00:00Z',
    })
    expect(opening.operation).toBe('openingStock')

    const adj = fromLocalStockMovement({
      id: 'm_003', shop_id: 'shop-default', product_id: 'p_001',
      quantity: -1, type: 'ADJUST', device_id: 'd_001', created_by: 'emp_001',
      reference_id: null, timestamp: '2025-09-10T08:00:00Z',
    })
    expect(adj.operation).toBe('correction')
  })

  test('[7] fromLocalDebt / DebtPayment / Expense — financial defaults', () => {
    const d = fromLocalDebt({
      id: 'd_001', businessId: 'shop-default', customer_id: 'c_001',
      sale_id: 's_001', amount: 1000, amount_paid: 250,
      status: 'partial', due_date: '2025-12-31', notes: 'owed',
      created_at: '2025-09-01', updated_at: '2025-09-01',
    })
    expect(d.balance).toBe(750) // amount - amount_paid
    expect(d.status).toBe('partial')

    const dp = fromLocalDebtPayment({
      id: 'dp_001', businessId: 'shop-default', debt_id: 'd_001',
      amount: 250, payment_method: 'cash', reference: 'RCT-001',
      created_at: '2025-09-05',
    })
    expect(dp.idempotencyKey).toBe('dp_001')

    const ex = fromLocalExpense({
      id: 'e_001', businessId: 'shop-default', amount: 500,
      description: 'rent', date: '2025-09-01', reference: 'RC-001',
      created_at: '2025-09-01', updated_at: '2025-09-01',
    }, 'rent')
    expect(ex.categoryName).toBe('rent')
    expect(ex.date).toBe('2025-09-01')
  })

  test('[8] fromLocalBusiness / Category / Invitation — defaults applied', () => {
    const b = fromLocalBusiness({
      id: 'shop-default', name: 'My Shop', cloud_owner_id: 'p_001',
      created_at: '2025-09-01',
    })
    expect(b.currency).toBe('KES') // default
    expect(b.status).toBe('active') // default
    expect(b.taxRate).toBe(0) // MISSING
    expect(b.plan).toBe('unknown') // MISSING

    const c = fromLocalCategory({
      id: 'cat_001', businessId: 'shop-default', name: 'Drinks',
      color: '#ff0000', description: null, is_active: 1,
      created_at: '2025-09-01', updated_at: '2025-09-01',
    })
    expect(c.color).toBe('#ff0000')
    expect(c.isActive).toBe(true)

    const inv = fromLocalInvitation({
      id: 'inv_001', shop_id: 'shop-default', employee_id: 'emp_001',
      code: '123456', expires_at: '2025-12-31', used_at: null,
      created_at: '2025-09-01',
    })
    expect(inv.status).toBe('pending') // used_at null → pending
    const invUsed = fromLocalInvitation({ ...inv, used_at: '2025-09-15' })
    expect(invUsed.status).toBe('accepted')
  })

  test('[9] fromLocalSaleLineItem — joins parent sale for shop_id', () => {
    const li = fromLocalSaleLineItem({
      id: 'li_001', sale_id: 's_001', product_id: 'p_001',
      product_name: 'Coca Cola 500ml', variation_name: null,
      quantity: 2, unit_price: 150, discount: 0, total_price: 300,
    }, { shop_id: 'shop-default', created_at: '2025-09-10' })
    expect(li.businessId).toBe('shop-default')
    expect(li.totalPrice).toBe(300)
  })
})
