/**
 * sync-engine-mobile.mocks.spec.ts — shared mocks for sync-engine-mobile.*
 * Cycle 04 Sub-cycle F.
 *
 * Centralises the `jest.mock` blocks + sqlite stub used by the
 * sync-engine-mobile suite. Importing this file once per test file
 * installs the gate no-ops; the sqlite stub holds the captured rows
 * for assertions.
 */
import { NoOpSyncEngineClass } from '@soostori/contracts'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const engine = NoOpSyncEngineClass as any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const engineQueue = engine as {
  size: number
  reset(): void
  lastMatching(pred: (e: Record<string, unknown>) => boolean): Record<string, unknown> | null
}

export const sqliteStore = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  products: new Map<string, Record<string, any>>(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sales: new Map<string, Record<string, any>>(),
  clear() { this.products.clear(); this.sales.clear() },
}

// Side-effect gates — installed via jest.mock below.
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
}))
jest.mock('react-native', () => ({
  AppState: {
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
}))
jest.mock('../../lib/instant-client', () => {
  const uploadedEvents: Array<Record<string, unknown>> = []
  const mockDb = {
    transact: jest.fn(async (ops: unknown[]) => {
      // Capture whatever was transacted
      for (const op of ops) {
        if (Array.isArray(op) && op[0] && typeof op[0] === 'object') {
          const createOp = op[0] as Record<string, unknown>
          if (createOp['create']) {
            uploadedEvents.push(createOp['create'] as Record<string, unknown>)
          }
        }
      }
      return { applied: ops.length }
    }),
    queryOnce: jest.fn(async () => ({ data: { syncEvents: [] } })),
  }
  // Build a proper tx chain: db.tx.syncEvents[id()].create(...)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(mockDb as any).tx = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    syncEvents: new Proxy({}, {
      get: (_t: unknown, id: string) => ({
        create: (data: Record<string, unknown>) => [id, { create: data }],
      }),
    }),
  }
  return {
    db: mockDb,
    id: () => `mock-id-${Date.now()}`,
    lookup: jest.fn(),
  }
})
jest.mock('../../services/sdk-bridge/subscription-gate', () => ({
  enforceSubscriptionOrThrow: jest.fn(async () => undefined),
  loadCachedSubscriptionState: jest.fn(async () => ({ state: 'NORMAL' as const, cached: null })),
}))
jest.mock('../../services/sdk-bridge/rbac', () => ({
  enforcePermission: jest.fn(),
  PERMISSIONS: { INVENTORY_EDIT: 'inventory.edit', POS_SELL: 'pos.sell' },
}))
jest.mock('../../services/entitlement-cache', () => ({
  getCachedEntitlement: jest.fn(async () => null),
}))
jest.mock('../../services/db-inventory-transactions', () => ({
  recordInventoryTransaction: jest.fn(async () => undefined),
}))
jest.mock('../../services/db-audit', () => ({
  logAudit: jest.fn(async () => undefined),
}))
jest.mock('../../services/sdk-bridge/sdk-event-bus', () => ({
  publishSdkEvent: jest.fn(async () => undefined),
}))
jest.mock('../../services/db-operational-gate', () => ({
  enforceStockMutationGate: jest.fn(),
}))
jest.mock('../../services/sync-queue-helper', () => ({
  queueSync: jest.fn(async () => undefined),
}))

// eslint-disable-next-line @typescript-eslint/no-explicit-any
jest.mock('../../lib/db', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getDb: () => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    runAsync: async (_sql: string, params?: any[]) => {
      const arr = Array.isArray(params) ? params : params != null ? [params] : []
      const id = String(arr[0] ?? '')
      if (_sql.startsWith('INSERT INTO products')) {
        sqliteStore.products.set(id, {
          id, shop_id: 'shop-test', name: arr[4], sku: arr[5],
          barcode: arr[6], image_url: arr[7], cost_price: arr[8],
          selling_price: arr[9], stock_quantity: arr[12],
          low_stock_threshold: arr[13], track_inventory: arr[14],
          allow_single_unit_sale: arr[15], units_per_package: arr[18],
          is_active: 1, group_prices: arr[20], created_at: arr[22],
          updated_at: arr[23], category_id: arr[1],
          distributor_name: arr[16], distributor_phone: arr[17],
          box_buying_price: arr[19],
        })
      } else if (_sql.startsWith('INSERT INTO sales')) {
        sqliteStore.sales.set(id, {
          id, shop_id: 'shop-test', type: 'retail', status: 'completed',
          subtotal: arr[3], discount_amount: arr[4], total_amount: arr[5],
          paid_amount: arr[6], payment_method: arr[7],
          customer_id: arr[9], employee_id: 'emp-test', device_id: 'dev-test',
          items: arr[10], created_at: arr[12], updated_at: arr[13],
        })
      }
      return { rowsAffected: 1, rows: [], insertId: 0 }
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getFirstAsync: async <T = any>(_sql: string, params?: any[]) => {
      const arr = Array.isArray(params) ? params : params != null ? [params] : []
      const id = String(arr[0] ?? '')
      if (_sql.startsWith('SELECT * FROM products')) return sqliteStore.products.get(id) as T
      if (_sql.startsWith('SELECT * FROM sales')) return sqliteStore.sales.get(id) as T
      if (_sql.startsWith('SELECT current_stock FROM products')) {
        const row = sqliteStore.products.get(id)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return row ? ({ current_stock: (row as any).current_stock ?? (row as any).stock_quantity ?? 0 } as T) : null
      }
      return null
    },
    getAllAsync: async () => [],
    execAsync: async () => undefined,
    withTransactionAsync: async (fn: () => Promise<unknown>) => { await fn() },
    closeAsync: async () => undefined,
  }),
}))
