// src/services/__tests__/expenses-mobile.spec.ts
// Phase 12 — 12 tests: expense CRUD + status workflow + monthly summary + sync events
// Uses synchronous jest.mock() (same pattern as debts-mobile.spec.ts)

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

import { getDb } from '../../lib/db'
import { defaultSyncEngine } from '@soostori/contracts'
import { queueSync } from '../../services/sync-queue-helper'

const mockRunAsync = jest.fn()
const mockGetFirstAsync = jest.fn()
const mockGetAllAsync = jest.fn()
;(getDb as jest.Mock).mockResolvedValue({
  runAsync: mockRunAsync,
  getFirstAsync: mockGetFirstAsync,
  getAllAsync: mockGetAllAsync,
})

beforeEach(() => {
  jest.clearAllMocks()
  mockRunAsync.mockResolvedValue(undefined)
  mockGetFirstAsync.mockResolvedValue(null)
  mockGetAllAsync.mockResolvedValue([])
})

// ── Helpers ──────────────────────────────────────────────────────────────────

function expRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'exp-001',
    category_id: 'cat-001',
    category_name: 'Rent',
    category_color: '#3B82F6',
    amount: 50000,
    description: 'Monthly rent',
    reference: 'REF-001',
    vendor: 'Landlord Ltd',
    date: '2025-09-01',
    status: 'pending',
    paid_at: null,
    created_by: 'emp-test',
    created_at: '2025-09-01T10:00:00Z',
    updated_at: '2025-09-01T10:00:00Z',
    ...overrides,
  }
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('Expenses Mobile Service', () => {
  // P1: createExpense inserts row with all fields including status=pending
  it('P1 — createExpense inserts row with status=pending and queues sync', async () => {
    const { createExpense } = await import('../db-expenses')
    mockGetFirstAsync.mockResolvedValueOnce(expRow())

    const result = await createExpense({
      categoryId: 'cat-001',
      amount: 50000,
      description: 'Monthly rent',
      reference: 'REF-001',
      vendor: 'Landlord Ltd',
      date: '2025-09-01',
    })

    expect(mockRunAsync).toHaveBeenCalledTimes(1)
    const [sql, params] = mockRunAsync.mock.calls[0] as [string, unknown[]]
    expect(sql).toContain('INSERT INTO expenses')
    expect(sql).toContain("'pending'")
    expect(params).toContain(50000)
    expect(params).toContain('Landlord Ltd')
    expect(result.status).toBe('pending')
  })

  // P2: approveExpense sets status = 'approved'
  it('P2 — approveExpense updates status to approved', async () => {
    const { approveExpense } = await import('../db-expenses')
    mockGetFirstAsync.mockResolvedValueOnce({ ...expRow(), status: 'approved' })

    await approveExpense('exp-001')

    expect(mockRunAsync).toHaveBeenCalledTimes(1)
    const [sql, params] = mockRunAsync.mock.calls[0] as [string, unknown[]]
    expect(sql).toContain("status = 'approved'")
    expect(params).toContain('exp-001')
  })

  // P3: markExpensePaid sets status = 'paid' and paidAt is set
  it('P3 — markExpensePaid sets status=paid and paidAt timestamp', async () => {
    const { markExpensePaid } = await import('../db-expenses')
    mockGetFirstAsync.mockResolvedValueOnce({
      ...expRow({ status: 'paid', paid_at: '2025-09-10T14:00:00Z' }),
    })

    await markExpensePaid('exp-001')

    expect(mockRunAsync).toHaveBeenCalledTimes(1)
    const [sql, params] = mockRunAsync.mock.calls[0] as [string, unknown[]]
    expect(sql).toContain("status = 'paid'")
    expect(sql).toContain('paid_at = ?')
    expect(params).toContain('exp-001')
  })

  // P4: getExpensesByDateRange returns expenses within range
  it('P4 — getExpensesByDateRange returns expenses within range', async () => {
    const { getExpensesByDateRange } = await import('../db-expenses')
    mockGetAllAsync.mockResolvedValueOnce([
      expRow({ id: 'exp-001', date: '2025-09-05' }),
      expRow({ id: 'exp-002', date: '2025-09-15' }),
    ])

    const results = await getExpensesByDateRange('2025-09-01', '2025-09-30')

    expect(mockGetAllAsync).toHaveBeenCalledTimes(1)
    expect(results).toHaveLength(2)
    expect(results[0].id).toBe('exp-001')
  })

  // P5: getExpenseSummaryByCategory returns correct totals and breakdown
  it('P5 — getExpenseSummaryByCategory returns total and byCategory breakdown', async () => {
    const { getExpenseSummaryByCategory } = await import('../db-expenses')
    mockGetFirstAsync
      .mockResolvedValueOnce({ total: 150000 })
      .mockResolvedValueOnce({ cnt: 2 })
    mockGetAllAsync.mockResolvedValueOnce([
      { id: 'cat-001', name: 'Rent', color: '#3B82F6', total: 100000 },
      { id: 'cat-002', name: 'Utilities', color: '#F59E0B', total: 50000 },
    ])

    const summary = await getExpenseSummaryByCategory(2025, 9)

    expect(summary.total).toBe(150000)
    expect(summary.pendingCount).toBe(2)
    expect(summary.byCategory['cat-001'].amount).toBe(100000)
    expect(summary.byCategory['cat-001'].name).toBe('Rent')
    expect(summary.byCategory['cat-002'].color).toBe('#F59E0B')
  })

  // P6: getExpenseById returns expense with status and paidAt
  it('P6 — getExpenseById returns expense with status and paidAt', async () => {
    const { getExpenseById } = await import('../db-expenses')
    mockGetFirstAsync.mockResolvedValueOnce({ ...expRow({ status: 'approved', paid_at: null }) })

    const result = await getExpenseById('exp-001')

    expect(result).not.toBeNull()
    expect(result!.status).toBe('approved')
    expect(result!.paidAt).toBeUndefined()
    expect(result!.vendor).toBe('Landlord Ltd')
  })

  // P7: mapRow maps paid status and paidAt correctly
  it('P7 — mapRow maps paid status and paidAt correctly', async () => {
    const { getExpenseById } = await import('../db-expenses')
    mockGetFirstAsync.mockResolvedValueOnce({
      ...expRow({ status: 'paid', paid_at: '2025-09-10T14:00:00Z' }),
    })

    const result = await getExpenseById('exp-001')

    expect(result!.status).toBe('paid')
    expect(result!.paidAt).toBe('2025-09-10T14:00:00Z')
  })

  // P8: deleteExpense removes row and queues sync
  it('P8 — deleteExpense removes row and queues sync delete', async () => {
    const { deleteExpense } = await import('../db-expenses')

    await deleteExpense('exp-001')

    expect(mockRunAsync).toHaveBeenCalledWith('DELETE FROM expenses WHERE id = ?', ['exp-001'])
    expect(queueSync).toHaveBeenCalledWith('expenses', 'delete', 'exp-001')
  })

  // P9: updateExpense can update vendor field
  it('P9 — updateExpense can update vendor', async () => {
    const { updateExpense } = await import('../db-expenses')
    mockGetFirstAsync.mockResolvedValueOnce({ ...expRow({ vendor: 'New Landlord' }) })

    await updateExpense('exp-001', { vendor: 'New Landlord' })

    expect(mockRunAsync).toHaveBeenCalledTimes(1)
    const [sql, params] = mockRunAsync.mock.calls[0] as [string, unknown[]]
    expect(sql).toContain('vendor = ?')
    expect(params).toContain('New Landlord')
  })

  // P10: getMonthlyExpenseTotal returns sum for month
  it('P10 — getMonthlyExpenseTotal returns sum for the given month', async () => {
    const { getMonthlyExpenseTotal } = await import('../db-expenses')
    mockGetFirstAsync.mockResolvedValueOnce({ total: 75000 })

    const total = await getMonthlyExpenseTotal(2025, 9)

    expect(mockGetFirstAsync).toHaveBeenCalled()
    expect(total).toBe(75000)
  })

  // P11: getAllExpenses returns all expenses sorted by date desc
  it('P11 — getAllExpenses returns all expenses sorted by date desc', async () => {
    const { getAllExpenses } = await import('../db-expenses')
    mockGetAllAsync.mockResolvedValueOnce([
      expRow({ id: 'exp-002', date: '2025-09-15' }),
      expRow({ id: 'exp-001', date: '2025-09-01' }),
    ])

    const results = await getAllExpenses()

    expect(results).toHaveLength(2)
    expect(results[0].id).toBe('exp-002')
  })

  // P12: createExpense queues sync event via queueSync (queue processor → cloud)
  it('P12 — createExpense calls queueSync for expense.create', async () => {
    const { createExpense } = await import('../db-expenses')
    mockGetFirstAsync.mockResolvedValueOnce(expRow())

    await createExpense({ categoryId: 'cat-001', amount: 50000, date: '2025-09-01' })

    expect(queueSync).toHaveBeenCalledWith('expenses', 'create', expect.any(String))
  })
})
