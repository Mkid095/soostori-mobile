// src/services/__tests__/inventory-mobile.spec.ts
// Phase 09 — Inventory Mobile tests
import { describe, it, expect, beforeAll, jest } from '@jest/globals'

// ── Shared mock store (populated per test via setMockData) ───────────────────
const mockData = {
  products: [] as Record<string, unknown>[],
  transactions: [] as Record<string, unknown>[],
  summaryRow: { total: 0, value: 0 },
  lowStockRows: [] as Record<string, unknown>[],
}

function setMockData(data: typeof mockData) {
  mockData.products = data.products
  mockData.transactions = data.transactions
  mockData.summaryRow = data.summaryRow
  mockData.lowStockRows = data.lowStockRows
}

jest.mock('../../lib/db', () => ({
  getDb: jest.fn(async () => ({
    runAsync: jest.fn(),
    getAllAsync: jest.fn((sql: string) => {
      if (sql.includes('inventory_transactions')) return mockData.transactions
      if (sql.includes('COALESCE')) return [mockData.summaryRow]
      if (sql.includes('low_stock_threshold')) return mockData.lowStockRows
      return mockData.products
    }),
    getFirstAsync: jest.fn((_sql: string, params?: unknown[]) => {
      if (params && params[0]) {
        return mockData.products.find((p) => String(p.id) === String(params[0])) ?? null
      }
      return mockData.products[0] ?? null
    }),
  })),
}))

jest.mock('../../services/mobile-sync-service', () => ({ triggerSync: jest.fn(async () => {}) }))
jest.mock('@soostori/contracts', () => ({
  defaultSyncEngine: { enqueue: jest.fn(async () => {}) },
  NoOpSyncEngineClass: class NoOpSyncEngine {
    static size = 0; static reset() {} static lastMatching() { return null }
  },
}))
jest.mock('../../services/db-operational-gate', () => ({ enforceStockMutationGate: jest.fn(() => {}) }))
jest.mock('../../services/sdk-bridge/rbac', () => ({
  enforcePermission: jest.fn(async () => {}),
  PERMISSIONS: { INVENTORY_ADJUST: 'inventory_adjust' },
}))
jest.mock('../../services/sdk-bridge/subscription-gate', () => ({ enforceSubscriptionOrThrow: jest.fn(async () => {}) }))
jest.mock('../../services/session-helper', () => ({ getCurrentRole: jest.fn(async () => 'owner') }))
jest.mock('../../services/db-audit', () => ({ logAudit: jest.fn(async () => {}) }))
jest.mock('../../lib/contracts-mapper', () => ({
  fromLocalStockMovement: jest.fn((r: Record<string, unknown>) => ({
    id: String(r.id), businessId: String(r.shop_id), productId: String(r.product_id),
    quantity: Number(r.quantity), operation: 'adjustment' as const,
    timestamp: String(r.timestamp ?? r.created_at),
    notes: r.reason ? String(r.reason) : null,
    version: 1, deviceId: null, userId: null,
    idempotencyKey: String(r.id),
    createdAt: String(r.timestamp ?? r.created_at),
  })),
}))

// ── Seed AsyncStorage shopId ──────────────────────────────────────────────────
beforeAll(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const store: Map<string, string> = (global as any).__asyncStorageStore__ ?? new Map()
  ;(global as any).__asyncStorageStore__ = store
  store.set('@soostori:shopId', 'test-shop-id')
})

// ── Row helpers ──────────────────────────────────────────────────────────────

function productRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'p-1', category_id: 'cat-1', category_name: 'Beverages', category_color: '#f97316',
    name: 'Coca Cola 500ml', sku: 'COKE-500', barcode: '123456789', image_url: null,
    cost_price: 8000, selling_price: 12000, discount_price: null, unit: 'piece',
    stock_quantity: 50, low_stock_threshold: 10, track_inventory: 1,
    allow_single_unit_sale: 1, distributor_name: null, distributor_phone: null,
    units_per_package: null, box_buying_price: null, group_prices: null,
    is_active: 1, created_at: '2025-01-01T00:00:00.000Z', updated_at: '2025-01-01T00:00:00.000Z',
    current_stock: 50,
    ...overrides,
  }
}

function txRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'tx-1', shop_id: 'test-shop-id', product_id: 'p-1', variant_id: null, variant_name: null,
    type: 'ADJUSTMENT', quantity: 5, balance_after: 55, created_by: null, device_id: null,
    reference_id: null, reason: 'Breakage', timestamp: '2025-01-01T12:00:00.000Z',
    created_at: '2025-01-01T12:00:00.000Z',
    ...overrides,
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Inventory Mobile — Phase 09', () => {
  // ── getInventorySummary ─────────────────────────────────────────────────

  describe('getInventorySummary', () => {
    it('INV-M1: returns correct totals, value, and low-stock list', async () => {
      setMockData({
        products: [
          productRow({ id: 'p-1', name: 'Coca Cola', stock_quantity: 50, low_stock_threshold: 10, cost_price: 8000, track_inventory: 1, is_active: 1 }),
          productRow({ id: 'p-2', name: 'Fanta', stock_quantity: 5, low_stock_threshold: 10, cost_price: 7000, track_inventory: 1, is_active: 1 }),
          productRow({ id: 'p-3', name: 'Chips', stock_quantity: 0, low_stock_threshold: 5, cost_price: 3000, track_inventory: 1, is_active: 1 }),
          productRow({ id: 'p-4', name: 'Inactive', stock_quantity: 5, low_stock_threshold: 10, is_active: 0 }),
          productRow({ id: 'p-5', name: 'No Track', stock_quantity: 5, low_stock_threshold: 10, track_inventory: 0, is_active: 1 }),
        ],
        transactions: [],
        summaryRow: { total: 3, value: 435000 },
        lowStockRows: [
          productRow({ id: 'p-3', name: 'Chips', stock_quantity: 0, low_stock_threshold: 5, cost_price: 3000, track_inventory: 1, is_active: 1 }),
          productRow({ id: 'p-2', name: 'Fanta', stock_quantity: 5, low_stock_threshold: 10, cost_price: 7000, track_inventory: 1, is_active: 1 }),
        ],
      })
      const { getInventorySummary } = await import('../../services/inventory-mobile')
      const summary = await getInventorySummary()
      expect(summary.totalProducts).toBe(3)
      expect(summary.totalValue).toBe(435000)
      expect(summary.lowStockCount).toBe(2)
      expect(summary.lowStockProducts.map((p) => p.id).sort()).toEqual(['p-2', 'p-3'])
      expect(summary.lowStockProducts[0].stockQuantity).toBe(0)
      expect(summary.lowStockProducts[1].stockQuantity).toBe(5)
    })

    it('INV-M2: returns zeros when no products exist', async () => {
      setMockData({ products: [], transactions: [], summaryRow: { total: 0, value: 0 }, lowStockRows: [] })
      const { getInventorySummary } = await import('../../services/inventory-mobile')
      const summary = await getInventorySummary()
      expect(summary.totalProducts).toBe(0)
      expect(summary.totalValue).toBe(0)
      expect(summary.lowStockCount).toBe(0)
      expect(summary.lowStockProducts).toHaveLength(0)
    })

    it('INV-M3: excludes inactive products from totals and low-stock', async () => {
      setMockData({
        products: [
          productRow({ id: 'p-active', name: 'Active', stock_quantity: 5, low_stock_threshold: 10, track_inventory: 1, is_active: 1 }),
          productRow({ id: 'p-inactive', name: 'Inactive', stock_quantity: 5, low_stock_threshold: 10, track_inventory: 1, is_active: 0 }),
        ],
        transactions: [],
        summaryRow: { total: 1, value: 35000 },
        lowStockRows: [
          productRow({ id: 'p-active', name: 'Active', stock_quantity: 5, low_stock_threshold: 10, track_inventory: 1, is_active: 1 }),
        ],
      })
      const { getInventorySummary } = await import('../../services/inventory-mobile')
      const summary = await getInventorySummary()
      expect(summary.totalProducts).toBe(1)
      expect(summary.lowStockCount).toBe(1)
    })
  })

  // ── getRecentStockMovements ─────────────────────────────────────────────

  describe('getRecentStockMovements', () => {
    it('INV-M4: returns movements in DESC order with correct limit', async () => {
      // SQLite ORDER BY timestamp DESC returns newest first
      setMockData({
        products: [],
        transactions: [
          txRow({ id: 'tx-new', timestamp: '2025-01-01T14:00:00.000Z' }),
          txRow({ id: 'tx-mid', timestamp: '2025-01-01T12:00:00.000Z' }),
          txRow({ id: 'tx-old', timestamp: '2025-01-01T10:00:00.000Z' }),
        ],
        summaryRow: { total: 0, value: 0 },
        lowStockRows: [],
      })
      const { getRecentStockMovements } = await import('../../services/inventory-mobile')
      const movements = await getRecentStockMovements(2)
      expect(movements[0].id).toBe('tx-new')
      expect(movements[1].id).toBe('tx-mid')
      expect(movements).toHaveLength(2)
    })

    it('INV-M5: returns empty array when no transactions', async () => {
      setMockData({ products: [], transactions: [], summaryRow: { total: 0, value: 0 }, lowStockRows: [] })
      const { getRecentStockMovements } = await import('../../services/inventory-mobile')
      const movements = await getRecentStockMovements()
      expect(movements).toHaveLength(0)
    })
  })

  // ── adjustStock negative-stock guard ─────────────────────────────────────

  describe('adjustStock — negative stock guard', () => {
    it('INV-M6: positive delta increases stock', async () => {
      setMockData({
        products: [productRow({ id: 'p-1', stock_quantity: 50, current_stock: 50 })],
        transactions: [], summaryRow: { total: 0, value: 0 }, lowStockRows: [],
      })
      const { adjustStock } = await import('../../services/db-products')
      await expect(adjustStock('p-1', 10, 'Restock')).resolves.toBeUndefined()
    })

    it('INV-M7: negative delta within available stock decreases stock', async () => {
      setMockData({
        products: [productRow({ id: 'p-1', stock_quantity: 50, current_stock: 50 })],
        transactions: [], summaryRow: { total: 0, value: 0 }, lowStockRows: [],
      })
      const { adjustStock } = await import('../../services/db-products')
      await expect(adjustStock('p-1', -30, 'Breakage')).resolves.toBeUndefined()
    })

    it('INV-M8: negative delta equal to current stock brings stock to zero', async () => {
      setMockData({
        products: [productRow({ id: 'p-1', stock_quantity: 50, current_stock: 50 })],
        transactions: [], summaryRow: { total: 0, value: 0 }, lowStockRows: [],
      })
      const { adjustStock } = await import('../../services/db-products')
      await expect(adjustStock('p-1', -50, 'Full write-off')).resolves.toBeUndefined()
    })

    it('INV-M9: negative delta that would result in negative stock throws', async () => {
      setMockData({
        products: [productRow({ id: 'p-1', stock_quantity: 50, current_stock: 50 })],
        transactions: [], summaryRow: { total: 0, value: 0 }, lowStockRows: [],
      })
      const { adjustStock } = await import('../../services/db-products')
      await expect(adjustStock('p-1', -51, 'Breakage')).rejects.toThrow(/negative stock/i)
    })

    it('INV-M10: product not found throws', async () => {
      setMockData({
        products: [productRow({ id: 'p-other', stock_quantity: 50, current_stock: 50 })],
        transactions: [], summaryRow: { total: 0, value: 0 }, lowStockRows: [],
      })
      const { adjustStock } = await import('../../services/db-products')
      await expect(adjustStock('nonexistent', 10, 'Restock')).rejects.toThrow(/not found/i)
    })
  })
})
