// src/services/__tests__/reports-mobile.spec.ts
// Phase 13 — 12 tests: DashboardSummary, SalesReport, InventoryReport, DebtReport, ExpenseReport

jest.mock('../../lib/db')
jest.mock('../../lib/formatters', () => ({ generateId: () => 'gen-id' }))
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue('test-shop-id'),
  default: { getItem: jest.fn().mockResolvedValue('test-shop-id') },
}))
jest.mock('@soostori/contracts', () => ({
  defaultSyncEngine: { enqueue: jest.fn().mockResolvedValue(undefined) },
}))
jest.mock('../../services/sdk-bridge/rbac', () => ({
  enforcePermission: jest.fn().mockResolvedValue(undefined),
  PERMISSIONS: { EXPENSES_MANAGE: 'expenses.manage' },
}))
jest.mock('../../services/sdk-bridge/subscription-gate', () => ({
  enforceSubscriptionOrThrow: jest.fn().mockResolvedValue(undefined),
}))
jest.mock('../../services/session-helper', () => ({
  getCurrentRole: jest.fn().mockResolvedValue('owner'),
}))
jest.mock('../../services/sync-queue-helper', () => ({
  queueSync: jest.fn().mockResolvedValue(undefined),
}))

// ── Mock DB (re-created fresh for each test) ──────────────────────────────────

function createMockDb() {
  const mockRunAsync = jest.fn()
  const mockGetFirstAsync = jest.fn()
  const mockGetAllAsync = jest.fn()
  return { mockRunAsync, mockGetFirstAsync, mockGetAllAsync }
}

// ── Test helpers ───────────────────────────────────────────────────────────────

function saleRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'sale-001',
    status: 'completed',
    total_amount: 10000,
    total_cost: 6000,
    subtotal: 10000,
    discount_amount: 0,
    paid_amount: 10000,
    payment_method: 'cash',
    customer_id_number: null,
    created_at: '2025-09-10T10:00:00.000Z',
    updated_at: '2025-09-10T10:00:00.000Z',
    ...overrides,
  }
}

function productRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'prod-001',
    name: 'Test Product',
    current_stock: 10,
    cost_price: 100,
    low_stock_threshold: 5,
    is_active: 1,
    track_inventory: 1,
    ...overrides,
  }
}

function debtRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'debt-001',
    amount: 5000,
    status: 'pending',
    due_date: '2025-09-01',
    customer_id_number: 'CUST001',
    amount_paid: 0,
    customer_name: 'Test Customer',
    ...overrides,
  }
}

// ── P1: DashboardSummary — all fields populated ────────────────────────────────

test('P1: getDashboardSummary returns all fields correctly', async () => {
  const { mockRunAsync, mockGetFirstAsync, mockGetAllAsync } = createMockDb()
  const { getDb } = await import('../../lib/db')
  ;(getDb as jest.Mock).mockResolvedValue({
    runAsync: mockRunAsync,
    getFirstAsync: mockGetFirstAsync,
    getAllAsync: mockGetAllAsync,
  })

  mockGetFirstAsync
    .mockResolvedValueOnce({ cnt: 3 })
    .mockResolvedValueOnce({ cnt: 1 })
    .mockResolvedValueOnce({ cnt: 5 })

  mockGetAllAsync
    .mockResolvedValueOnce([saleRow({ id: 's1', total_amount: 5000, total_cost: 3000 })])
    .mockResolvedValueOnce([
      saleRow({ id: 's1', total_amount: 5000, total_cost: 3000 }),
      saleRow({ id: 's2', total_amount: 3000, total_cost: 1800 }),
    ])
    .mockResolvedValueOnce([
      saleRow({ id: 's1', total_amount: 5000, total_cost: 3000 }),
      saleRow({ id: 's2', total_amount: 3000, total_cost: 1800 }),
    ])
    .mockResolvedValueOnce([
      debtRow({ id: 'd1', amount: 5000, amount_paid: 2000 }),
      debtRow({ id: 'd2', amount: 3000, amount_paid: 0 }),
    ])

  const { getDashboardSummary } = await import('../../services/db-reports-full')
  const result = await getDashboardSummary()

  expect(result.todaySales).toBe(1)
  expect(result.todayRevenue).toBe(5000)
  expect(result.weekSales).toBe(2)
  expect(result.weekRevenue).toBe(8000)
  expect(result.monthSales).toBe(2)
  expect(result.monthRevenue).toBe(8000)
  expect(result.monthCost).toBe(4800)
  expect(result.grossProfit).toBe(3200)
  expect(result.grossMargin).toBeCloseTo(40, 1)
  expect(result.lowStockCount).toBe(3)
  expect(result.outstandingDebts).toBe(6000)
  expect(result.pendingExpenses).toBe(1)
  expect(result.activeCustomers).toBe(5)
})

// ── P2: DashboardSummary — zero when no data ───────────────────────────────────

test('P2: getDashboardSummary returns zeros when no data', async () => {
  const { mockRunAsync, mockGetFirstAsync, mockGetAllAsync } = createMockDb()
  const { getDb } = await import('../../lib/db')
  ;(getDb as jest.Mock).mockResolvedValue({
    runAsync: mockRunAsync,
    getFirstAsync: mockGetFirstAsync,
    getAllAsync: mockGetAllAsync,
  })

  mockGetFirstAsync
    .mockResolvedValueOnce({ cnt: 0 })
    .mockResolvedValueOnce({ cnt: 0 })
    .mockResolvedValueOnce({ cnt: 0 })

  mockGetAllAsync
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([])

  const { getDashboardSummary } = await import('../../services/db-reports-full')
  const result = await getDashboardSummary()

  expect(result.todaySales).toBe(0)
  expect(result.todayRevenue).toBe(0)
  expect(result.grossMargin).toBe(0)
  expect(result.lowStockCount).toBe(0)
  expect(result.outstandingDebts).toBe(0)
  expect(result.pendingExpenses).toBe(0)
})

// ── P3: SalesReport — totals, byPaymentMethod, averageSaleValue ───────────────

test('P3: getSalesReport totals and byPaymentMethod correct', async () => {
  const { mockRunAsync, mockGetFirstAsync, mockGetAllAsync } = createMockDb()
  const { getDb } = await import('../../lib/db')
  ;(getDb as jest.Mock).mockResolvedValue({
    runAsync: mockRunAsync,
    getFirstAsync: mockGetFirstAsync,
    getAllAsync: mockGetAllAsync,
  })

  mockGetAllAsync
    .mockResolvedValueOnce([
      saleRow({ id: 's1', total_amount: 5000, total_cost: 3000, payment_method: 'cash' }),
      saleRow({ id: 's2', total_amount: 3000, total_cost: 1800, payment_method: 'mpesa' }),
    ])
    .mockResolvedValueOnce([
      { id: 'i1', sale_id: 's1', product_id: 'p1', product_name: 'Item A', quantity: 2, total_price: 5000 },
    ])
    .mockResolvedValueOnce([
      { id: 'i2', sale_id: 's2', product_id: 'p2', product_name: 'Item B', quantity: 3, total_price: 3000 },
    ])

  const { getSalesReport } = await import('../../services/db-reports-full')
  const result = await getSalesReport('2025-09-01T00:00:00Z', '2025-09-30T23:59:59Z')

  expect(result.totalSales).toBe(2)
  expect(result.totalRevenue).toBe(8000)
  expect(result.totalCost).toBe(4800)
  expect(result.grossProfit).toBe(3200)
  expect(result.grossMargin).toBeCloseTo(40, 1)
  expect(result.byPaymentMethod['cash'].amount).toBe(5000)
  expect(result.byPaymentMethod['cash'].count).toBe(1)
  expect(result.byPaymentMethod['mpesa'].amount).toBe(3000)
  expect(result.byPaymentMethod['mpesa'].count).toBe(1)
  expect(result.salesCount).toBe(2)
  expect(result.averageSaleValue).toBe(4000)
})

// ── P4: SalesReport — topProducts sorted by revenue ───────────────────────────

test('P4: getSalesReport topProducts sorted by revenue descending', async () => {
  const { mockRunAsync, mockGetFirstAsync, mockGetAllAsync } = createMockDb()
  const { getDb } = await import('../../lib/db')
  ;(getDb as jest.Mock).mockResolvedValue({
    runAsync: mockRunAsync,
    getFirstAsync: mockGetFirstAsync,
    getAllAsync: mockGetAllAsync,
  })

  mockGetAllAsync
    .mockResolvedValueOnce([
      saleRow({ id: 's1', total_amount: 5000, total_cost: 3000, payment_method: 'cash' }),
    ])
    .mockResolvedValueOnce([
      { id: 'i1', sale_id: 's1', product_id: 'p1', product_name: 'Cheap Item', quantity: 10, total_price: 1000 },
      { id: 'i2', sale_id: 's1', product_id: 'p2', product_name: 'Expensive Item', quantity: 1, total_price: 4000 },
    ])

  const { getSalesReport } = await import('../../services/db-reports-full')
  const result = await getSalesReport('2025-09-01T00:00:00Z', '2025-09-30T23:59:59Z')

  expect(result.topProducts[0].name).toBe('Expensive Item')
  expect(result.topProducts[0].revenue).toBe(4000)
  expect(result.topProducts[1].name).toBe('Cheap Item')
  expect(result.topProducts[1].revenue).toBe(1000)
})

// ── P5: InventoryReport — totalProducts and reorder suggestions ─────────────────

test('P5: getInventoryReport totalProducts and reorder suggestions', async () => {
  const { mockRunAsync, mockGetFirstAsync, mockGetAllAsync } = createMockDb()
  const { getDb } = await import('../../lib/db')
  ;(getDb as jest.Mock).mockResolvedValue({
    runAsync: mockRunAsync,
    getFirstAsync: mockGetFirstAsync,
    getAllAsync: mockGetAllAsync,
  })

  mockGetFirstAsync.mockResolvedValueOnce({ cnt: 2 })
  mockGetAllAsync
    .mockResolvedValueOnce([productRow({ id: 'p1', name: 'Low Stock Widget', current_stock: 3, low_stock_threshold: 10 })])
    .mockResolvedValueOnce([productRow({ id: 'p1', name: 'Low Stock Widget', current_stock: 3, cost_price: 50 })])
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([productRow({ id: 'p1', name: 'Low Stock Widget', current_stock: 3, low_stock_threshold: 10 })])

  const { getInventoryReport } = await import('../../services/db-reports-full')
  const result = await getInventoryReport()

  expect(result.totalProducts).toBe(2)
  expect(result.lowStockCount).toBe(1)
  expect(result.reorderSuggestions[0].suggestedOrder).toBe(17)
})

// ── P6: InventoryReport — dead stock detection ────────────────────────────────

test('P6: getInventoryReport dead stock when no movement > 30 days', async () => {
  const { mockRunAsync, mockGetFirstAsync, mockGetAllAsync } = createMockDb()
  const { getDb } = await import('../../lib/db')
  ;(getDb as jest.Mock).mockResolvedValue({
    runAsync: mockRunAsync,
    getFirstAsync: mockGetFirstAsync,
    getAllAsync: mockGetAllAsync,
  })

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 31)

  mockGetFirstAsync.mockResolvedValueOnce({ cnt: 2 })
  mockGetAllAsync
    .mockResolvedValueOnce([productRow({ id: 'p1', name: 'Dead Stock Item', current_stock: 5, low_stock_threshold: 2 })])
    .mockResolvedValueOnce([productRow({ id: 'p1', name: 'Dead Stock Item', current_stock: 5, cost_price: 200 })])
    .mockResolvedValueOnce([{ id: 'p1', name: 'Dead Stock Item', last_movement: thirtyDaysAgo.toISOString() }])
    .mockResolvedValueOnce([productRow({ id: 'p1', name: 'Dead Stock Item', current_stock: 5, low_stock_threshold: 2 })])

  const { getInventoryReport } = await import('../../services/db-reports-full')
  const result = await getInventoryReport()

  expect(result.deadStock.length).toBeGreaterThanOrEqual(1)
  expect(result.reorderSuggestions.length).toBeGreaterThanOrEqual(1)
})

// ── P7: DebtReport — aging bucket calculations ─────────────────────────────────

test('P7: getDebtReport aging buckets calculated correctly', async () => {
  const { mockRunAsync, mockGetFirstAsync, mockGetAllAsync } = createMockDb()
  const { getDb } = await import('../../lib/db')
  ;(getDb as jest.Mock).mockResolvedValue({
    runAsync: mockRunAsync,
    getFirstAsync: mockGetFirstAsync,
    getAllAsync: mockGetAllAsync,
  })

  const now = new Date()
  const d15 = new Date(now); d15.setDate(d15.getDate() - 15)
  const d45 = new Date(now); d45.setDate(d45.getDate() - 45)
  const d75 = new Date(now); d75.setDate(d75.getDate() - 75)
  const d120 = new Date(now); d120.setDate(d120.getDate() - 120)

  mockGetAllAsync.mockResolvedValueOnce([
    debtRow({ id: 'd1', amount: 1000, amount_paid: 0, due_date: d15.toISOString().slice(0, 10), status: 'pending' }),
    debtRow({ id: 'd2', amount: 2000, amount_paid: 0, due_date: d45.toISOString().slice(0, 10), status: 'partial' }),
    debtRow({ id: 'd3', amount: 3000, amount_paid: 0, due_date: d75.toISOString().slice(0, 10), status: 'pending' }),
    debtRow({ id: 'd4', amount: 4000, amount_paid: 0, due_date: d120.toISOString().slice(0, 10), status: 'pending' }),
  ])

  const { getDebtReport } = await import('../../services/db-reports-full')
  const result = await getDebtReport()

  expect(result.agingBuckets['0-30']).toBe(1000)
  expect(result.agingBuckets['31-60']).toBe(2000)
  expect(result.agingBuckets['61-90']).toBe(3000)
  expect(result.agingBuckets['90+']).toBe(4000)
  expect(result.totalOutstanding).toBe(10000)
  expect(result.overdueCount).toBe(4)
  expect(result.partialCount).toBe(1)
})

// ── P8: DebtReport — byCustomer sorted by outstanding ──────────────────────────

test('P8: getDebtReport byCustomer sorted by outstanding descending', async () => {
  const { mockRunAsync, mockGetFirstAsync, mockGetAllAsync } = createMockDb()
  const { getDb } = await import('../../lib/db')
  ;(getDb as jest.Mock).mockResolvedValue({
    runAsync: mockRunAsync,
    getFirstAsync: mockGetFirstAsync,
    getAllAsync: mockGetAllAsync,
  })

  mockGetAllAsync.mockResolvedValueOnce([
    debtRow({ id: 'd1', amount: 500, amount_paid: 0, customer_id_number: 'C1', customer_name: 'Small Customer' }),
    debtRow({ id: 'd2', amount: 5000, amount_paid: 0, customer_id_number: 'C2', customer_name: 'Big Customer' }),
    debtRow({ id: 'd3', amount: 1000, amount_paid: 0, customer_id_number: 'C1', customer_name: 'Small Customer' }),
  ])

  const { getDebtReport } = await import('../../services/db-reports-full')
  const result = await getDebtReport()

  expect(result.byCustomer[0].name).toBe('Big Customer')
  expect(result.byCustomer[0].outstanding).toBe(5000)
  expect(result.byCustomer[1].name).toBe('Small Customer')
  expect(result.byCustomer[1].outstanding).toBe(1500)
  expect(result.byCustomer[1].debtCount).toBe(2)
})

// ── P9: ExpenseReport — monthly totals and category breakdown ──────────────────

test('P9: getExpenseReport totals and byCategory correct', async () => {
  const { mockRunAsync, mockGetFirstAsync, mockGetAllAsync } = createMockDb()
  const { getDb } = await import('../../lib/db')
  ;(getDb as jest.Mock).mockResolvedValue({
    runAsync: mockRunAsync,
    getFirstAsync: mockGetFirstAsync,
    getAllAsync: mockGetAllAsync,
  })

  mockGetFirstAsync
    .mockResolvedValueOnce({ total: 15000 })
    .mockResolvedValueOnce({ cnt: 2 })
    .mockResolvedValueOnce({ total: 10000 })

  // The SQL joins expense_categories with expenses and returns { id, total } per category
  mockGetAllAsync.mockResolvedValueOnce([
    { id: 'cat-001', total: 10000 },
    { id: 'cat-002', total: 5000 },
  ])

  const { getExpenseReport } = await import('../../services/db-reports-full')
  const result = await getExpenseReport(2025, 9)

  expect(result.total).toBe(15000)
  expect(result.pendingCount).toBe(2)
  expect(result.byCategory['cat-001']).toBe(10000)
  expect(result.byCategory['cat-002']).toBe(5000)
  expect(result.vsPriorMonth).toBeCloseTo(50, 0)
})

// ── P10: ExpenseReport — vsPriorMonth negative ────────────────────────────────

test('P10: getExpenseReport vsPriorMonth negative when expenses decreased', async () => {
  const { mockRunAsync, mockGetFirstAsync, mockGetAllAsync } = createMockDb()
  const { getDb } = await import('../../lib/db')
  ;(getDb as jest.Mock).mockResolvedValue({
    runAsync: mockRunAsync,
    getFirstAsync: mockGetFirstAsync,
    getAllAsync: mockGetAllAsync,
  })

  mockGetFirstAsync
    .mockResolvedValueOnce({ total: 5000 })
    .mockResolvedValueOnce({ cnt: 1 })
    .mockResolvedValueOnce({ total: 10000 })

  mockGetAllAsync.mockResolvedValueOnce([])

  const { getExpenseReport } = await import('../../services/db-reports-full')
  const result = await getExpenseReport(2025, 9)

  expect(result.total).toBe(5000)
  expect(result.vsPriorMonth).toBe(-50)
})

// ── P11: DebtReport — pending/partial isolation ───────────────────────────────

test('P11: getDebtReport only includes pending/partial debts', async () => {
  const { mockRunAsync, mockGetFirstAsync, mockGetAllAsync } = createMockDb()
  const { getDb } = await import('../../lib/db')
  ;(getDb as jest.Mock).mockResolvedValue({
    runAsync: mockRunAsync,
    getFirstAsync: mockGetFirstAsync,
    getAllAsync: mockGetAllAsync,
  })

  mockGetAllAsync.mockResolvedValueOnce([
    debtRow({ id: 'd1', amount: 5000, status: 'pending', amount_paid: 0 }),
    debtRow({ id: 'd2', amount: 3000, status: 'partial', amount_paid: 0 }),
  ])

  const { getDebtReport } = await import('../../services/db-reports-full')
  const result = await getDebtReport()

  expect(result.totalOutstanding).toBe(8000)
  expect(result.partialCount).toBe(1)
})

// ── P12: SalesReport — zero when no sales in period ───────────────────────────

test('P12: getSalesReport returns zeros when no sales in period', async () => {
  const { mockRunAsync, mockGetFirstAsync, mockGetAllAsync } = createMockDb()
  const { getDb } = await import('../../lib/db')
  ;(getDb as jest.Mock).mockResolvedValue({
    runAsync: mockRunAsync,
    getFirstAsync: mockGetFirstAsync,
    getAllAsync: mockGetAllAsync,
  })

  mockGetAllAsync.mockResolvedValueOnce([])

  const { getSalesReport } = await import('../../services/db-reports-full')
  const result = await getSalesReport('2025-09-01T00:00:00Z', '2025-09-30T23:59:59Z')

  expect(result.totalSales).toBe(0)
  expect(result.totalRevenue).toBe(0)
  expect(result.totalCost).toBe(0)
  expect(result.grossProfit).toBe(0)
  expect(result.grossMargin).toBe(0)
  expect(result.topProducts).toHaveLength(0)
  expect(result.averageSaleValue).toBe(0)
})
