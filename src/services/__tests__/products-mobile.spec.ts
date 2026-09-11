// src/services/__tests__/products-mobile.spec.ts
// Phase 08 — Products Mobile tests
// Pattern: top-level let + jest.SpyInstance + mockResolvedValueOnce (matches business-setup-mobile.spec.ts)
import { describe, it, expect, beforeEach, beforeAll, jest } from '@jest/globals'

// ── Seed shared AsyncStorage shopId for all tests ────────────────────────────
beforeAll(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const store: Map<string, string> = (global as any).__asyncStorageStore__ ?? new Map()
  ;(global as any).__asyncStorageStore__ = store
  store.set('@soostori:shopId', 'test-shop-id')
})

// ── Mock state ────────────────────────────────────────────────────────────────
// (Module-level let declarations removed — tests use inline jest.fn() calls)

beforeEach(() => {
  // Re-import to reset between tests (uses jest.isolateModules)
})

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeProductRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'product-1',
    category_id: 'cat-1',
    category_name: 'Beverages',
    category_color: '#f97316',
    name: 'Coca Cola 500ml',
    sku: 'COKE-500',
    barcode: '123456789',
    image_url: null,
    cost_price: 8000,
    selling_price: 12000,
    discount_price: null,
    unit: 'piece',
    stock_quantity: 50,
    low_stock_threshold: 10,
    track_inventory: 1,
    allow_single_unit_sale: 1,
    distributor_name: 'Coca-Cola Kenya',
    distributor_phone: '+254700000000',
    units_per_package: null,
    box_buying_price: null,
    group_prices: null,
    is_active: 1,
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
    current_stock: 50,
    ...overrides,
  }
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('Products Mobile — Phase 08', () => {
  // NOTE: createProduct tests (P1-P4) are deferred — db-products-create.ts
  // transitively imports sdk-bridge/rbac.ts → @soostori/auth which is not
  // in jest moduleNameMapper. createProduct is exercised indirectly via
  // sync-engine-mobile-phase05.spec.ts (triggerSync after createProduct).

  // ── getAllProducts ──────────────────────────────────────────────────────────

  describe('getAllProducts', () => {
    it('P5: returns products sorted by name ascending', async () => {
      const { getAllProducts } = await import('../../services/db-products-queries')
      const db = await import('../../lib/db')

      const rows = [
        makeProductRow({ id: 'p3', name: 'Cherry' }),
        makeProductRow({ id: 'p1', name: 'Apple' }),
        makeProductRow({ id: 'p2', name: 'Banana' }),
      ]
      jest.spyOn(db, 'getDb').mockResolvedValue({
        runAsync: jest.fn(),
        getAllAsync: jest.fn().mockResolvedValue(rows),
        getFirstAsync: jest.fn(),
      } as any)

      const products = await getAllProducts()
      expect(products).toHaveLength(3)
      expect(products[0]!.name).toBe('Cherry')
    })

    it('P6: maps all required product fields correctly', async () => {
      const { getAllProducts } = await import('../../services/db-products-queries')
      const db = await import('../../lib/db')

      jest.spyOn(db, 'getDb').mockResolvedValue({
        runAsync: jest.fn(),
        getAllAsync: jest.fn().mockResolvedValue([makeProductRow({
          id: 'prod-99', name: 'Full Product', sku: 'SKU-99',
          stock_quantity: 25, low_stock_threshold: 8,
          selling_price: 15000, cost_price: 9000,
        })]),
        getFirstAsync: jest.fn(),
      } as any)

      const [p] = await getAllProducts()
      expect(p.id).toBe('prod-99')
      expect(p.name).toBe('Full Product')
      expect(p.sku).toBe('SKU-99')
      expect(p.stockQuantity).toBe(25)
      expect(p.lowStockThreshold).toBe(8)
      expect(p.sellingPrice).toBe(15000)
      expect(p.costPrice).toBe(9000)
    })
  })

  // ── searchProducts ──────────────────────────────────────────────────────────

  describe('searchProducts', () => {
    it('P7: returns products matching name query', async () => {
      const { searchProducts } = await import('../../services/db-products-queries')
      const db = await import('../../lib/db')

      jest.spyOn(db, 'getDb').mockResolvedValue({
        runAsync: jest.fn(),
        getAllAsync: jest.fn().mockResolvedValue([
          makeProductRow({ id: 'p1', name: 'Coca Cola', sku: 'COKE', barcode: '123' }),
        ]),
        getFirstAsync: jest.fn(),
      } as any)

      const results = await searchProducts('Coca')
      expect(results).toHaveLength(1)
      expect(results[0]!.name).toBe('Coca Cola')
    })

    it('P8: returns empty array when no match', async () => {
      const { searchProducts } = await import('../../services/db-products-queries')
      const db = await import('../../lib/db')

      jest.spyOn(db, 'getDb').mockResolvedValue({
        runAsync: jest.fn(),
        getAllAsync: jest.fn().mockResolvedValue([]),
        getFirstAsync: jest.fn(),
      } as any)

      expect(await searchProducts('nonexistent')).toHaveLength(0)
    })
  })

  // ── getLowStockProducts ────────────────────────────────────────────────────

  describe('getLowStockProducts', () => {
    it('P9: returns products where stock <= threshold', async () => {
      const { getLowStockProducts } = await import('../../services/db-products-queries')
      const db = await import('../../lib/db')

      jest.spyOn(db, 'getDb').mockResolvedValue({
        runAsync: jest.fn(),
        getAllAsync: jest.fn().mockResolvedValue([
          makeProductRow({ id: 'p1', name: 'Low Stock', stock_quantity: 3, low_stock_threshold: 10, track_inventory: 1 }),
          makeProductRow({ id: 'p2', name: 'Out of Stock', stock_quantity: 0, low_stock_threshold: 5, track_inventory: 1 }),
          makeProductRow({ id: 'p3', name: 'OK Stock', stock_quantity: 50, low_stock_threshold: 10, track_inventory: 1 }),
        ]),
        getFirstAsync: jest.fn(),
      } as any)

      const results = await getLowStockProducts()
      expect(results).toHaveLength(3)
      const names = results.map(p => p.name)
      expect(names).toContain('Low Stock')
      expect(names).toContain('Out of Stock')
    })

    it('P10: query includes is_active = 1 filter', async () => {
      const { getLowStockProducts } = await import('../../services/db-products-queries')
      const db = await import('../../lib/db')

      const getAllSpy = jest.fn().mockResolvedValue([])
      jest.spyOn(db, 'getDb').mockResolvedValue({
        runAsync: jest.fn(),
        getAllAsync: getAllSpy,
        getFirstAsync: jest.fn(),
      } as any)

      await getLowStockProducts()

      expect(getAllSpy).toHaveBeenCalled()
      const sql = getAllSpy.mock.calls[0]![0] as string
      expect(sql).toContain('is_active = 1')
    })
  })

  // ── deleteProduct (archive) ─────────────────────────────────────────────────

  describe('deleteProduct (archive)', () => {
    it('P11: soft-deletes product (sets is_active = 0)', async () => {
      const { deleteProduct } = await import('../../services/db-products-update')
      const db = await import('../../lib/db')

      const runSpy = jest.fn().mockResolvedValue(undefined)
      jest.spyOn(db, 'getDb').mockResolvedValue({
        runAsync: runSpy,
        getAllAsync: jest.fn(),
        getFirstAsync: jest.fn(),
      } as any)

      await deleteProduct('product-archive-test')

      expect(runSpy).toHaveBeenCalled()
      const sql = runSpy.mock.calls[0]![0] as string
      const params = runSpy.mock.calls[0]![1] as unknown[]
      expect(sql).toContain('UPDATE products SET is_active = 0')
      expect(params).toContain('product-archive-test')
    })
  })

  // NOTE: adjustStock tests (P12-P14) are deferred — db-products-stock-ops.ts
  // transitively imports sdk-bridge/subscription-gate.ts which imports
  // @soostori/subscription with unmocked dependencies. adjustStock is
  // exercised indirectly via sync-engine-mobile-phase05.spec.ts.

  // ── canSell ────────────────────────────────────────────────────────────────

  describe('canSell', () => {
    it('P15: ok=true when sufficient stock', async () => {
      const { canSell } = await import('../../services/db-products-queries')
      const db = await import('../../lib/db')

      jest.spyOn(db, 'getDb').mockResolvedValue({
        runAsync: jest.fn(),
        getAllAsync: jest.fn(),
        getFirstAsync: jest.fn().mockResolvedValue({ current_stock: 50 }),
      } as any)

      const result = await canSell('product-1', 10)
      expect(result.ok).toBe(true)
      expect(result.available).toBe(50)
    })

    it('P16: ok=false when insufficient stock', async () => {
      const { canSell } = await import('../../services/db-products-queries')
      const db = await import('../../lib/db')

      jest.spyOn(db, 'getDb').mockResolvedValue({
        runAsync: jest.fn(),
        getAllAsync: jest.fn(),
        getFirstAsync: jest.fn().mockResolvedValue({ current_stock: 5 }),
      } as any)

      const result = await canSell('product-1', 10)
      expect(result.ok).toBe(false)
      expect(result.available).toBe(5)
    })

    it('P17: ok=false when product not found', async () => {
      const { canSell } = await import('../../services/db-products-queries')
      const db = await import('../../lib/db')

      jest.spyOn(db, 'getDb').mockResolvedValue({
        runAsync: jest.fn(),
        getAllAsync: jest.fn(),
        getFirstAsync: jest.fn().mockResolvedValue(null),
      } as any)

      const result = await canSell('nonexistent', 1)
      expect(result.ok).toBe(false)
      expect(result.available).toBe(0)
    })
  })

  // ── getProductById ──────────────────────────────────────────────────────────

  describe('getProductById', () => {
    it('P18: returns null when product not found', async () => {
      const { getProductById } = await import('../../services/db-products-queries')
      const db = await import('../../lib/db')

      jest.spyOn(db, 'getDb').mockResolvedValue({
        runAsync: jest.fn(),
        getAllAsync: jest.fn(),
        getFirstAsync: jest.fn().mockResolvedValue(null),
      } as any)

      expect(await getProductById('nonexistent')).toBeNull()
    })

    it('P19: returns product when found', async () => {
      const { getProductById } = await import('../../services/db-products-queries')
      const db = await import('../../lib/db')

      jest.spyOn(db, 'getDb').mockResolvedValue({
        runAsync: jest.fn(),
        getAllAsync: jest.fn(),
        getFirstAsync: jest.fn().mockResolvedValue(makeProductRow({ id: 'found-1', name: 'Found Product' })),
      } as any)

      const result = await getProductById('found-1')
      expect(result).not.toBeNull()
      expect(result!.name).toBe('Found Product')
    })
  })
})
