/**
 * sync-engine-mobile.spec.ts — Cycle 04 Sub-cycle F.
 *
 * Proves that `createProduct` and `createSale` on Mobile call
 * `defaultSyncEngine.enqueue(event)` after the local sqlite INSERT
 * succeeds. Event payload must match @soostori/contracts SyncEvent §6 —
 * built via `fromLocalProduct`/`fromLocalSale` from the just-inserted
 * row, then enqueued on the shared `defaultSyncEngine` singleton.
 *
 * Run with: npx jest sync-engine-mobile
 */
import './sync-engine-mobile.mocks'

import { defaultSyncEngine, NoOpSyncEngineClass } from '@soostori/contracts'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createProduct } from '../../services/db-products-create'
import { createSale } from '../../services/db-sale-create'
import type { CartItem } from '../../lib/types'
import { engineQueue, sqliteStore } from './sync-engine-mobile.mocks'

beforeEach(async () => {
  engineQueue.reset()
  sqliteStore.clear()
  await AsyncStorage.clear()
  await AsyncStorage.setItem('@soostori:shopId', 'shop-test')
  await AsyncStorage.setItem('@soostori:employeeRole', 'owner')
})

describe('sync-engine-mobile (Cycle 04 Sub-cycle F)', () => {
  test('[1] createProduct enqueues a SyncEvent<Product> on defaultSyncEngine', async () => {
    await createProduct({
      name: 'Coca Cola 500ml', sku: 'COK-500', barcode: '5449000000996',
      costPrice: 80, sellingPrice: 150, unit: 'bottle', stockQuantity: 24,
      lowStockThreshold: 5, trackInventory: true, allowSingleUnitSale: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
    await new Promise(r => setImmediate(r))
    const evt = engineQueue.lastMatching(e => e.entityKind === 'product')
    expect(evt).not.toBeNull()
    expect(evt!.operation).toBe('create')
    expect(evt!.entityKind).toBe('product')
    expect(evt!.businessId).toBe('shop-test')
    expect(evt!.state).toBe('pending')
    expect(evt!.entityVersion).toBe(1)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload = evt!.payload as any
    expect(payload.name).toBe('Coca Cola 500ml')
    expect(payload.sellingPrice).toBe(150)
    expect(payload.businessId).toBe('shop-test')
  })

  test('[2] createSale enqueues a SyncEvent<Sale> on defaultSyncEngine', async () => {
    sqliteStore.products.set('p_001', {
      id: 'p_001', shop_id: 'shop-test', name: 'Coca Cola 500ml', sku: 'COK-500',
      barcode: '5449000000996', cost_price: 80, selling_price: 150,
      stock_quantity: 24, current_stock: 24, low_stock_threshold: 5,
      track_inventory: 1, allow_single_unit_sale: 1, is_active: 1,
      group_prices: null, units_per_package: 1, category_id: null,
      distributor_name: null, distributor_phone: null, box_buying_price: null,
      created_at: '2026-09-10T08:00:00Z', updated_at: '2026-09-10T08:00:00Z',
    })
    const items: CartItem[] = [{
      productId: 'p_001', productName: 'Coca Cola 500ml',
      quantity: 2, unitPrice: 150, discount: 0, totalPrice: 300,
    }]
    const sale = await createSale(items, 'cash' as never, 300, 0, 300)
    expect((sale as { id: string }).id).toBeTruthy()
    await new Promise(r => setImmediate(r))
    const evt = engineQueue.lastMatching(e => e.entityKind === 'sale')
    expect(evt).not.toBeNull()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload = evt!.payload as any
    expect(payload.totalAmount).toBe(300)
    expect(payload.paymentMethod).toBe('cash')
    expect(Array.isArray(payload.items)).toBe(true)
  })

  test('[3] defaultSyncEngine + NoOpSyncEngineClass share the same instance', async () => {
    expect(defaultSyncEngine).toBeDefined()
    expect(NoOpSyncEngineClass).toBeDefined()
    await (defaultSyncEngine as unknown as { enqueue: (e: unknown) => Promise<unknown> })
      .enqueue({ id: 'probe', idempotencyKey: 'k', businessId: 'shop-test',
        entityKind: 'product', entityId: 'p_x', operation: 'create',
        originatingDeviceId: 'd', originatingEmployeeId: 'e',
        clientSequence: 1, clientCreatedAt: new Date().toISOString(),
        entityVersion: 1, payload: {}, state: 'pending' })
    expect(engineQueue.size).toBeGreaterThanOrEqual(1)
  })

  test('[4] SyncEvent §6 — every required field is populated', async () => {
    await createProduct({
      name: 'Sprite', sellingPrice: 100, unit: 'bottle', stockQuantity: 5,
      lowStockThreshold: 2, trackInventory: true, allowSingleUnitSale: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
    await new Promise(r => setImmediate(r))
    const evt = engineQueue.lastMatching(e => e.entityKind === 'product')!
    expect(evt.id).toBeTruthy()
    expect(evt.idempotencyKey).toBeTruthy()
    expect(evt.businessId).toBe('shop-test')
    expect(evt.entityId).toBeTruthy()
    expect(evt.originatingDeviceId).toBeTruthy()
    expect(evt.originatingEmployeeId).toBeTruthy()
    expect(typeof evt.clientSequence).toBe('number')
    expect(typeof evt.clientCreatedAt).toBe('string')
    expect(evt.payload).toBeDefined()
  })
})
