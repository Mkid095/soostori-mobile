/**
 * sync-engine-mobile-phase05.spec.ts — Phase 05 Real Sync Tests
 *
 * Tests the real FIDScript-backed MobileSyncEngine:
 *  1. enqueue() uploads a product event to cloud (via InstantClient mock)
 *  2. pull() retrieves cloud events for the current shop
 *  3. apply() upserts a cloud product into local SQLite
 *  4. Business isolation: events with wrong shopId are ignored
 *
 * Run with: npx jest sync-engine-mobile-phase05
 */
import './sync-engine-mobile.mocks'

import { NoOpSyncEngineClass } from '@soostori/contracts'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createProduct } from '../../services/db-products-create'
import { engineQueue } from './sync-engine-mobile.mocks'

beforeEach(async () => {
  engineQueue.reset()
  await AsyncStorage.clear()
  await AsyncStorage.setItem('@soostori:shopId', 'shop-test')
  await AsyncStorage.setItem('@soostori:employeeRole', 'owner')
})

describe('Phase 05 — Mobile Real Sync Engine', () => {
  test('[P1] createProduct calls enqueue with all SyncEvent fields', async () => {
    await createProduct({
      name: 'TestSync001', sku: 'SYNC001', sellingPrice: 100,
      unit: 'piece', stockQuantity: 10, lowStockThreshold: 2,
      trackInventory: true, allowSingleUnitSale: true,
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
    expect(evt!.idempotencyKey).toBeTruthy()
    expect(evt!.originatingDeviceId).toBeTruthy()
    expect(evt!.originatingEmployeeId).toBe('system')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload = evt!.payload as any
    expect(payload.name).toBe('TestSync001')
    expect(payload.sku).toBe('SYNC001')
  })

  test('[P2] enqueue uploads event to FIDScript cloud via transact', async () => {
    // Direct test: call mobile-sync-engine's enqueue with a synthetic event
    const { enqueue } = await import('../../services/mobile-sync-engine')
    const { db } = require('../../lib/instant-client')
    ;(db.transact as jest.Mock).mockClear()

    await enqueue({
      id: 'evt-p2',
      idempotencyKey: 'ik-p2',
      businessId: 'shop-test',
      entityKind: 'product',
      entityId: 'prod-p2',
      operation: 'create',
      originatingDeviceId: 'mobile',
      originatingEmployeeId: 'system',
      clientSequence: 1,
      clientCreatedAt: new Date().toISOString(),
      entityVersion: 1,
      payload: { name: 'CloudProduct', sku: 'CP001', sellingPrice: 200, costPrice: 100, stockQuantity: 5, unit: 'box', trackInventory: true, allowSingleUnitSale: true, isActive: true },
      state: 'pending',
    })

    expect(db.transact).toHaveBeenCalled()
  })

  test('[P3] pull returns events from cloud query', async () => {
    const { db } = require('../../lib/instant-client')

    // Simulate cloud having one event for this shop
    ;(db.queryOnce as jest.Mock).mockResolvedValueOnce({
      data: {
        syncEvents: [
          {
            id: 'cloud-evt-1',
            shopId: 'shop-test',
            entity: 'product',
            entityId: 'prod-cloud-1',
            operation: 'create',
            payload: { name: 'FromCloud', sku: 'FROMCLOUD', sellingPrice: 999, costPrice: 500, stockQuantity: 20, unit: 'piece', trackInventory: true, allowSingleUnitSale: true, isActive: true },
            syncedAt: new Date().toISOString(),
            version: 1,
            idempotencyKey: 'cloud-ik-1',
            timestamp: new Date().toISOString(),
            sequenceNumber: 1,
            deviceId: 'desktop-1',
          },
        ],
      },
    })

    // Import pull from the engine module
    const { pull } = await import('../../services/mobile-sync-engine')
    const shopId = 'shop-test'

    // Override getCurrentShopId for this test
    jest.doMock('../../services/session-helper', () => ({
      getCurrentShopId: jest.fn(() => Promise.resolve(shopId)),
    }))

    const result = await pull(null)

    expect(result.events.length).toBe(1)
    expect(result.events[0].entityKind).toBe('product')
    expect(result.events[0].entityId).toBe('prod-cloud-1')
  })

  test('[P4] business isolation — event with wrong shopId is ignored', async () => {
    const { db } = require('../../lib/instant-client')

    // Simulate cloud having an event for a DIFFERENT shop
    ;(db.queryOnce as jest.Mock).mockResolvedValueOnce({
      data: {
        syncEvents: [
          {
            id: 'cross-shop-evt',
            shopId: 'other-shop', // NOT 'shop-test'
            entity: 'product',
            entityId: 'prod-other',
            operation: 'create',
            payload: { name: 'OtherShop', sku: 'OTHER', sellingPrice: 100, costPrice: 50, stockQuantity: 5, unit: 'piece', trackInventory: true, allowSingleUnitSale: true, isActive: true },
            syncedAt: new Date().toISOString(),
            version: 1,
            idempotencyKey: 'cross-shop-ik',
            timestamp: new Date().toISOString(),
            sequenceNumber: 1,
            deviceId: 'desktop-other',
          },
        ],
      },
    })

    const { pull, apply } = await import('../../services/mobile-sync-engine')

    const result = await pull(null)
    // Event is returned by pull (it belongs to the query result)
    expect(result.events.length).toBe(1)

    // But apply() must reject it due to business isolation
    const applyResult = await apply(null, result.events[0], 'shop-test')
    expect(applyResult.state).toBe('no_op')
  })
})
