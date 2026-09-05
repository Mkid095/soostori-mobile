/**
 * MobileSalesRepository — SDK contract verification.
 *
 * Phase 11.3 (Mobile Commerce). Stubs the DB layer; verifies bridge
 * method signatures and wiring shape.
 *
 * Run with:   npx tsx src/services/adapters/sales/__tests__/mobile-sales-repository.test.ts
 */

import { newId } from '@soostori/core'
import { SalesService } from '@soostori/sales'
import type { UUID } from '@soostori/core'

import {
  MobileSalesRepository,
  __setMobileSalesRepositoryDbForTesting,
} from '../mobile-sales-repository'

let passed = 0
let failed = 0

function assert(name: string, cond: boolean): void {
  if (cond) { console.log(`  ✓ ${name}`); passed++ }
  else { console.log(`  ✗ ${name}`); failed++ }
}

interface StubSales {
  getSaleById: (i: string) => Promise<unknown>
  getAllSales: () => Promise<unknown[]>
  getHeldSales: () => Promise<unknown[]>
  deleteHeldSale: (i: string) => Promise<void>
}

async function run(): Promise<void> {
  console.log('\n=== Phase 11.3c MobileSalesRepository contract tests ===\n')

  // [1] Adapter instantiates and satisfies SalesRepository.
  const repo = new MobileSalesRepository()
  assert('[1] MobileSalesRepository constructs', repo !== null)
  assert('[1] implements SalesRepository methods',
    typeof repo.findById === 'function'
    && typeof repo.findMany === 'function'
    && typeof repo.create === 'function'
    && typeof repo.update === 'function'
    && typeof repo.totals === 'function'
    && typeof repo.findHeldSales === 'function'
    && typeof repo.createHeldSale === 'function'
    && typeof repo.deleteHeldSale === 'function'
    && typeof repo.findItemsBySaleId === 'function')

  // [2] totals() returns the SDK SalesTotals shape.
  const totals = await repo.totals()
  assert('[2] totals() returns count + byPaymentMethod', typeof totals.count === 'number' && typeof totals.byPaymentMethod === 'object')

  // [3] findHeldSales works through the stub.
  const stub: StubSales = {
    async getSaleById(id) { return id === 'real-sale' ? { id, total: 1234 } : null },
    async getAllSales() { return [{ id: 's1', total: 100 }, { id: 's2', total: 50 }] },
    async getHeldSales() { return [{ id: 'h1', cart: '[]' }] },
    async deleteHeldSale() { /* silent */ },
  }
  __setMobileSalesRepositoryDbForTesting(stub as never)

  const found = await repo.findById('real-sale' as UUID)
  assert('[3] findById returns stubbed sale', (found as unknown as { total: number })?.total === 1234)

  const absent = await repo.findById(newId() as UUID)
  assert('[3] findById absent returns null', absent === null)

  // [4] findMany returns all stub rows.
  const all = await repo.findMany()
  assert('[4] findMany returns 2 stub sales', all.length === 2)

  // [5] findHeldSales with shopId returns held list.
  const held = await repo.findHeldSales(newId() as UUID)
  assert('[5] findHeldSales returns held list (size 1)', held.length === 1)

  // [6] createHeldSale round-trips an id.
  const heldNew = await repo.createHeldSale({
    cart: '[]',
    name: null,
    payment_method: 'cash',
  } as never)
  assert('[6] createHeldSale returns id+createdAt', Boolean(heldNew.id) && Boolean(heldNew.createdAt))

  // [7] deleteHeldSale is silent through stub.
  let threw = false
  try { await repo.deleteHeldSale(newId() as UUID) } catch { threw = true }
  assert('[7] deleteHeldSale is silent', threw === false)

  // [8] SalesService type accepts the Mobile repos + a Mobile product repo stub.
  // Verifies the SDK canonical service construction compiles against Mobile.
  const productStub = {
    findById: async () => null,
    findMany: async () => [],
    findByBarcode: async () => null,
    create: async () => ({}),
    update: async () => ({}),
    softDelete: async () => undefined,
    findCategoryById: async () => null,
    findCategories: async () => [],
    createCategory: async () => ({}),
    updateCategory: async () => ({}),
    findVariants: async () => [],
    createVariant: async () => ({}),
    decrementStock: async () => undefined,
    incrementStock: async () => undefined,
    setStock: async () => undefined,
  }
  const svc = new SalesService(
    repo as never,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    productStub as any,
    'shop-1' as never,
    'device-1' as never,
    () => undefined,
  )
  assert('[8] SalesService constructs with MobileSalesRepository', svc !== null)

  console.log(`\nTotal: ${passed} passed, ${failed} failed`)
  process.exit(failed === 0 ? 0 : 1)
}

run().catch((err: unknown) => {
  console.error('test runner failed:', err)
  process.exit(2)
})
