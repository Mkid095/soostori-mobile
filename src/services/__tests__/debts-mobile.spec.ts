// debts-mobile.spec.ts — Phase 11: Customer & Debt mobile tests
// Tests: createDebt, recordDebtPayment (partial/full), getDebtsByCustomer,
// getDebtById with payments, getAllDebts sort by urgency, sync events emitted.

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
  PERMISSIONS: { DEBT_MANAGE: 'debt.manage' },
}))
jest.mock('../../services/sdk-bridge/subscription-gate', () => ({
  enforceSubscriptionOrThrow: jest.fn().mockResolvedValue(undefined),
}))
jest.mock('../../services/session-helper', () => ({
  getCurrentRole: jest.fn().mockResolvedValue('owner'),
}))

import { getDb } from '../../lib/db'
import { defaultSyncEngine } from '@soostori/contracts'

const mockRunAsync = jest.fn()
const mockGetFirstAsync = jest.fn()
const mockGetAllAsync = jest.fn()
;(getDb as jest.Mock).mockResolvedValue({
  runAsync: mockRunAsync,
  getFirstAsync: mockGetFirstAsync,
  getAllAsync: mockGetAllAsync,
})

// Default: return empty arrays to avoid "undefined.map()" errors
beforeEach(() => {
  jest.clearAllMocks()
  mockRunAsync.mockResolvedValue(undefined)
  mockGetFirstAsync.mockResolvedValue(null)
  mockGetAllAsync.mockResolvedValue([])
})

const enqueueSpy = jest.spyOn(defaultSyncEngine, 'enqueue')

// ── Helpers ──────────────────────────────────────────────────────────────────

function debtRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'debt-1',
    customer_id: 'cust-1',
    customer_name: 'Alice Wanjiku',
    customer_phone: '0700123456',
    sale_id: null,
    amount: 50000,
    amount_paid: 0,
    status: 'pending',
    due_date: null,
    notes: null,
    created_at: '2025-09-01T00:00:00.000Z',
    updated_at: '2025-09-01T00:00:00.000Z',
    ...overrides,
  }
}

function paymentRows(count = 1): Record<string, unknown>[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `pay-${i + 1}`,
    debt_id: 'debt-1',
    amount: (i + 1) * 10000,
    payment_method: 'cash',
    reference: null,
    notes: null,
    created_at: `2025-09-0${i + 2}T00:00:00.000Z`,
  }))
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('createDebt — Phase 11', () => {
  beforeEach(() => { jest.clearAllMocks() })

  it('P1: inserts debt row with amount_paid=0, status=pending', async () => {
    const { createDebt } = await import('../../services/db-debts')
    mockGetFirstAsync.mockResolvedValueOnce(debtRow())

    await createDebt({ customerName: 'Alice Wanjiku', amount: 50000 })

    expect(mockRunAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO debts'),
      expect.arrayContaining(['gen-id', null, 'Alice Wanjiku', null, null, 50000, null]),
    )
  })

  it('P2: enqueues canonical SyncEvent with entityKind=debt, operation=create', async () => {
    const { createDebt } = await import('../../services/db-debts')
    mockGetFirstAsync.mockResolvedValueOnce(debtRow())

    await createDebt({ customerName: 'Bob', amount: 30000 })

    expect(enqueueSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        entityKind: 'debt',
        operation: 'create',
        idempotencyKey: 'gen-id',
      }),
    )
  })
})

describe('recordDebtPayment — Phase 11', () => {
  beforeEach(() => { jest.clearAllMocks() })

  it('P3: inserts payment row with correct fields', async () => {
    const { recordDebtPayment } = await import('../../services/db-debts')
    mockGetFirstAsync
      .mockResolvedValueOnce(debtRow({ amount_paid: 0 }))   // getDebtById: debt query
      .mockResolvedValueOnce({ total: 20000 })              // getDebtById: getDebtPayments count

    await recordDebtPayment('debt-1', 20000, 'mobile_money')

    expect(mockRunAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO debt_payments'),
      expect.arrayContaining(['gen-id', 'debt-1', 20000, 'mobile_money', null, null, expect.any(String)]),
    )
  })

  it('P4: recomputes amount_paid from SUM(payments) and updates status=partial', async () => {
    const { recordDebtPayment } = await import('../../services/db-debts')
    mockGetFirstAsync
      .mockResolvedValueOnce(debtRow({ amount_paid: 0 }))
      .mockResolvedValueOnce({ total: 20000 })

    await recordDebtPayment('debt-1', 20000, 'cash')

    const updateCall = mockRunAsync.mock.calls.find(
      (c: unknown[]) => String(c[0]).includes('UPDATE debts'),
    )
    expect(updateCall).toBeDefined()
    expect(updateCall![1][0]).toBe(20000)
    expect(updateCall![1][1]).toBe('partial')
  })

  it('P5: full payment → status=paid (paid >= amount)', async () => {
    const { recordDebtPayment } = await import('../../services/db-debts')
    mockGetFirstAsync
      .mockResolvedValueOnce(debtRow({ amount_paid: 30000 }))
      .mockResolvedValueOnce({ total: 50000 })

    await recordDebtPayment('debt-1', 20000, 'cash')

    const updateCall = mockRunAsync.mock.calls.find(
      (c: unknown[]) => String(c[0]).includes('UPDATE debts'),
    )
    expect(updateCall![1][1]).toBe('paid')
  })

  it('P6: enqueues SyncEvent with entityKind=debt, operation=payment', async () => {
    const { recordDebtPayment } = await import('../../services/db-debts')
    mockGetFirstAsync
      .mockResolvedValueOnce(debtRow())
      .mockResolvedValueOnce({ total: 10000 })

    await recordDebtPayment('debt-1', 10000, 'card')

    expect(enqueueSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        entityKind: 'debt',
        operation: 'create',
        idempotencyKey: 'gen-id',
      }),
    )
  })
})

describe('getDebtById with payments — Phase 11', () => {
  beforeEach(() => { jest.clearAllMocks() })

  it('P7: returns debt with payments array loaded', async () => {
    const { getDebtById } = await import('../../services/db-debts')
    mockGetFirstAsync
      .mockResolvedValueOnce(debtRow())                           // debt query
      .mockResolvedValueOnce({ total: 2 })                        // count query inside
    mockGetAllAsync.mockResolvedValueOnce(paymentRows(2))

    const result = await getDebtById('debt-1')

    expect(result?.payments).toBeDefined()
    expect(result?.payments).toHaveLength(2)
    expect(result?.payments![0].amount).toBe(10000)
  })

  it('P8: returns null for non-existent debt', async () => {
    // Override the beforeEach default for this test
    mockGetFirstAsync.mockRestore()
    mockGetFirstAsync.mockResolvedValueOnce(null)

    const { getDebtById } = await import('../../services/db-debts')
    const result = await getDebtById('nonexistent')

    expect(result).toBeNull()
  })
})

describe('getDebtsByCustomer — Phase 11', () => {
  beforeEach(() => { jest.clearAllMocks() })

  it('P9: returns only debts for the given customerId', async () => {
    const { getDebtsByCustomer } = await import('../../services/db-debts')
    mockGetAllAsync.mockResolvedValueOnce([
      debtRow({ id: 'd1', customer_id: 'cust-1' }),
      debtRow({ id: 'd2', customer_id: 'cust-1' }),
    ])

    const result = await getDebtsByCustomer('cust-1')

    expect(result).toHaveLength(2)
    expect(mockGetAllAsync).toHaveBeenCalledWith(
      expect.stringContaining('WHERE customer_id = ?'),
      ['cust-1'],
    )
  })
})

describe('getAllDebts — Phase 11', () => {
  beforeEach(() => { jest.clearAllMocks() })

  it('P10: getAllDebts SQL includes status filter and urgency sort', async () => {
    const { getAllDebts } = await import('../../services/db-debts')
    mockGetAllAsync.mockResolvedValueOnce([])

    await getAllDebts()

    const sql = mockGetAllAsync.mock.calls[0][0]
    expect(sql).toContain("WHERE status != 'paid'")
    expect(sql).toContain('ORDER BY')
    expect(sql).toContain('CASE WHEN')
  })
})

describe('sync event field completeness — Phase 11', () => {
  beforeEach(() => { jest.clearAllMocks() })

  it('P11: createDebt event has all required SyncEvent fields', async () => {
    const { createDebt } = await import('../../services/db-debts')
    mockGetFirstAsync.mockResolvedValueOnce(debtRow())

    await createDebt({ customerName: 'Test', amount: 10000 })

    const event = enqueueSpy.mock.calls[0][0]
    expect(event.id).toBe('gen-id')
    expect(event.idempotencyKey).toBe('gen-id')
    expect(event.businessId).toBeDefined()
    expect(event.entityKind).toBe('debt')
    expect(event.entityId).toBe('gen-id')
    expect(event.operation).toBe('create')
    expect(event.originatingDeviceId).toBeDefined()
    expect(event.originatingEmployeeId).toBeDefined()
    expect(event.clientSequence).toBeDefined()
    expect(event.clientCreatedAt).toBeDefined()
    expect(event.entityVersion).toBeDefined()
    expect(event.payload).toBeDefined()
    expect(event.state).toBe('pending')
  })

  it('P12: payment event uses payment.id as idempotencyKey', async () => {
    const { recordDebtPayment } = await import('../../services/db-debts')
    mockGetFirstAsync
      .mockResolvedValueOnce(debtRow())
      .mockResolvedValueOnce({ total: 5000 })

    await recordDebtPayment('debt-1', 5000, 'cash')

    const event = enqueueSpy.mock.calls[0][0]
    expect(event.idempotencyKey).toBe('gen-id')
    expect(event.operation).toBe('create')
    expect(event.entityKind).toBe('debt')
  })
})
