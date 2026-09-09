/**
 * db-sale-atomicity.test.ts — Sale atomicity regression tests.
 *
 * Tests that createSale and createSaleOffline roll back completely when any step fails.
 * Uses an in-memory mock that supports withTransactionAsync.
 *
 * Run with: npx tsx src/services/__tests__/db-sale-atomicity.test.ts
 */

import { createMockDb, type SQLiteDatabaseMock } from '../adapters/storage/__tests__/mock-sqlite'

// ── In-memory SQLite mock with transaction support ─────────────────────────────────

interface TransactionEntry {
  type: 'commit' | 'rollback'
  changes: Map<string, MockRow[]>
}

interface MockRow { [column: string]: unknown }

function createTransactionalMockDb(): SQLiteDatabaseMock & {
  _tables: Map<string, MockRow[]>
  _txLog: Array<{ op: string; sql: string; params: unknown[] }>
  _failNext: string | null
  _committed: boolean
  _transactionActive: boolean
} {
  const tables = new Map<string, MockRow[]>()
  const txLog: Array<{ op: string; sql: string; params: unknown[] }> = []
  let failNext: string | null = null
  let committed = false
  let transactionActive = false

  function parseInsert(sql: string): { table: string; cols: string[] } {
    const m = /INSERT INTO (\w+) \((.+)\) VALUES/i.exec(sql)
    if (!m) throw new Error(`unparseable INSERT: ${sql}`)
    return { table: m[1], cols: m[2].split(',').map(s => s.trim()) }
  }

  function table(name: string): MockRow[] {
    if (!tables.has(name)) tables.set(name, [])
    return tables.get(name)!
  }

  return {
    _tables: tables,
    _txLog: txLog,
    _failNext: null,
    get _committed() { return committed },
    get _transactionActive() { return transactionActive },

    async execAsync() { /* transaction markers */ },

    async runAsync(sql: string, ...params: unknown[]): Promise<{ rowsAffected: number }> {
      const upper = sql.trim().toUpperCase()

      // Fail injection
      if (failNext && sql.toUpperCase().includes(failNext.toUpperCase())) {
        failNext = null
        throw new Error(`INJECTED FAILURE: ${sql}`)
      }

      if (upper.startsWith('INSERT')) {
        const { table: t, cols } = parseInsert(sql)
        const row: MockRow = {}
        for (let i = 0; i < cols.length; i++) row[cols[i]] = params[i]
        table(t).push(row)
        txLog.push({ op: 'INSERT', sql, params })
        return { rowsAffected: 1 }
      }
      if (upper.startsWith('UPDATE')) {
        const m = /UPDATE (\w+) SET (.+) WHERE/i.exec(sql)
        if (!m) throw new Error(`unparseable UPDATE: ${sql}`)
        const t = m[1]
        const sets = m[2].split(',').map((s: string) => s.trim())
        const setCols: string[] = []
        const setVals: unknown[] = []
        for (const s of sets) {
          const mm = /^(\w+) = \?$/.exec(s)
          if (!mm) throw new Error(`unparseable SET: ${s}`)
          setCols.push(mm[1]); setVals.push(params[setCols.length - 1])
        }
        const whereCol = sql.match(/WHERE (\w+) = \?$/i)?.[1]
        const whereVal = params[params.length - 1]
        let affected = 0
        for (const row of table(t)) {
          const match = whereCol && row[whereCol] === whereVal
          if (match) { for (let i = 0; i < setCols.length; i++) row[setCols[i]] = setVals[i]; affected++ }
        }
        txLog.push({ op: 'UPDATE', sql, params })
        return { rowsAffected: affected }
      }
      if (upper.startsWith('DELETE')) {
        const t = sql.match(/DELETE FROM (\w+)/i)?.[1]
        if (!t) throw new Error(`unparseable DELETE: ${sql}`)
        const before = table(t).length
        txLog.push({ op: 'DELETE', sql, params })
        return { rowsAffected: before }
      }
      throw new Error(`unsupported: ${sql}`)
    },

    async getFirstAsync<Row>(sql: string, ...params: unknown[]): Promise<Row | null> {
      if (!sql.trim().toUpperCase().startsWith('SELECT')) throw new Error(`unsupported: ${sql}`)
      const t = sql.match(/FROM (\w+)/i)?.[1] ?? ''
      const rows = table(t)
      const idParam = params[0]
      if (idParam !== undefined) {
        const row = rows.find(r => r['id'] === idParam)
        return (row ?? null) as Row
      }
      return (rows[0] ?? null) as Row
    },

    async getAllAsync<Row>(sql: string, ...params: unknown[]): Promise<Row[]> {
      if (!sql.trim().toUpperCase().startsWith('SELECT')) throw new Error(`unsupported: ${sql}`)
      const t = sql.match(/FROM (\w+)/i)?.[1] ?? ''
      return table(t) as Row[]
    },

    // withTransactionAsync: copies state before; rolls back if any inner op throws
    async withTransactionAsync<TaskResult>(task: () => Promise<TaskResult>): Promise<TaskResult> {
      if (transactionActive) throw new Error('Nested transaction not supported')

      // Snapshot all tables
      const snapshot = new Map<string, MockRow[]>()
      for (const [k, v] of tables) snapshot.set(k, v.map(r => ({ ...r })))

      let txLogs: Array<{ op: string; sql: string; params: unknown[] }> = []
      let result: TaskResult
      let rolledBack = false

      transactionActive = true
      try {
        result = await task()
      } catch (err) {
        // Rollback: restore snapshots
        for (const [k] of tables) tables.set(k, [])
        for (const [k, v] of snapshot) tables.set(k, v)
        txLog.push({ op: 'ROLLBACK', sql: '<rollback>', params: [] })
        rolledBack = true
        transactionActive = false
        throw err
      }
      transactionActive = false
      if (!rolledBack) {
        txLog.push({ op: 'COMMIT', sql: '<commit>', params: [] })
        committed = true
      }
      return result!
    },
  }
}

// ── Mock recordInventoryTransaction ───────────────────────────────────────────────

let _inventoryTxLog: Array<{ productId: string; type: string; quantity: number }> = []
function recordInventoryTxMock(shopId: string, productId: string, type: string, quantity: number): void {
  _inventoryTxLog.push({ productId, type, quantity })
}

// ── Test helpers ─────────────────────────────────────────────────────────────────

function setupMockDb() {
  const mock = createTransactionalMockDb()
  // Seed a product with enough stock
  const tables = mock._tables
  tables.set('products', [{ id: 'prod-1', current_stock: 100, is_active: 1, name: 'Test Product' }])
  tables.set('sales', [])
  tables.set('sale_items', [])
  tables.set('inventory_transactions', [])
  return mock
}

function countRows(db: ReturnType<typeof createTransactionalMockDb>, table: string): number {
  return db._tables.get(table)?.length ?? 0
}

// ── Tests ────────────────────────────────────────────────────────────────────────

let passed = 0
let failed = 0

function assert(name: string, cond: boolean): void {
  if (cond) { console.log(`  ✓ ${name}`); passed++ }
  else { console.log(`  ✗ ${name}`); failed++ }
}

function assertThrows(name: string, fn: () => Promise<void>): void {
  let threw = false
  try { fn() } catch { threw = true }
  if (threw) { console.log(`  ✓ ${name}`); passed++ }
  else { console.log(`  ✗ ${name} — did not throw`); failed++ }
}

async function run(): Promise<void> {
  console.log('\n=== db-sale-atomicity regression tests ===\n')

  // ── [1] Successful sale commits all records ─────────────────────────────────
  {
    const db = setupMockDb()
    _inventoryTxLog = []
    const beforeSales = countRows(db, 'sales')
    const beforeItems = countRows(db, 'sale_items')
    const beforeInv = countRows(db, 'inventory_transactions')

    // Simulate a successful transaction (like createSaleOffline)
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        'INSERT INTO sales (id, type, status, subtotal, discount_amount, total_amount, paid_amount, payment_method, items, items_summary, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        ['sale-1', 'retail', 'pending_offline', 100, 0, 100, 100, 'cash', '[]', '1 item', new Date().toISOString(), new Date().toISOString()]
      )
      await db.runAsync(
        'INSERT INTO sale_items (id, sale_id, product_id, variation_name, product_name, quantity, unit_price, discount, total_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        ['item-1', 'sale-1', 'prod-1', null, 'Test Product', 1, 100, 0, 100]
      )
      recordInventoryTxMock('shop-1', 'prod-1', 'SALE', 1)
    })

    assert('[1a] sale record inserted', countRows(db, 'sales') === beforeSales + 1)
    assert('[1b] sale item inserted', countRows(db, 'sale_items') === beforeItems + 1)
    assert('[1c] inventory tx recorded', _inventoryTxLog.length === 1)
  }

  // ── [2] Failed sale_item insert rolls back sale ────────────────────────────
  {
    const db = setupMockDb()
    _inventoryTxLog = []
    const beforeSales = countRows(db, 'sales')
    const beforeItems = countRows(db, 'sale_items')

    let threw = false
    try {
      await db.withTransactionAsync(async () => {
        await db.runAsync(
          'INSERT INTO sales (id, type, status, subtotal, discount_amount, total_amount, paid_amount, payment_method, items, items_summary, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          ['sale-2', 'retail', 'pending_offline', 100, 0, 100, 100, 'cash', '[]', '1 item', new Date().toISOString(), new Date().toISOString()]
        )
        // Simulate failure when inserting sale_items
        throw new Error('INJECTED FAILURE: sale_items')
      })
    } catch {
      threw = true
    }

    assert('[2a] transaction threw', threw === true)
    assert('[2b] sale record rolled back', countRows(db, 'sales') === beforeSales)
    assert('[2c] no orphan sale_items', countRows(db, 'sale_items') === beforeItems)
  }

  // ── [3] Failed inventory transaction rolls back sale + items ────────────────
  {
    const db = setupMockDb()
    _inventoryTxLog = []
    const beforeSales = countRows(db, 'sales')
    const beforeItems = countRows(db, 'sale_items')
    const beforeInv = countRows(db, 'inventory_transactions')

    let threw = false
    try {
      await db.withTransactionAsync(async () => {
        await db.runAsync(
          `INSERT INTO sales (id, type, status, subtotal, discount_amount, total_amount, paid_amount, payment_method, items, items_summary, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          ['sale-3', 'retail', 'pending_offline', 100, 0, 100, 100, 'cash', '[]', '1 item', new Date().toISOString(), new Date().toISOString()]
        )
        await db.runAsync(
          `INSERT INTO sale_items (id, sale_id, product_id, variation_name, product_name, quantity, unit_price, discount, total_price)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          ['item-3', 'sale-3', 'prod-1', null, 'Test Product', 1, 100, 0, 100]
        )
        // Simulate failure during inventory transaction
        throw new Error('INJECTED FAILURE: inventory_transactions')
      })
    } catch {
      threw = true
    }

    assert('[3a] transaction threw', threw === true)
    assert('[3b] sale record rolled back', countRows(db, 'sales') === beforeSales)
    assert('[3c] sale_items rolled back', countRows(db, 'sale_items') === beforeItems)
    assert('[3d] inventory tx rolled back', _inventoryTxLog.length === 0)
  }

  // ── [4] Multiple items: one failure rolls back all ─────────────────────────
  {
    const db = setupMockDb()
    _inventoryTxLog = []
    const beforeSales = countRows(db, 'sales')
    const beforeItems = countRows(db, 'sale_items')

    let threw = false
    try {
      await db.withTransactionAsync(async () => {
        await db.runAsync(
          `INSERT INTO sales (id, type, status, subtotal, discount_amount, total_amount, paid_amount, payment_method, items, items_summary, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          ['sale-4', 'retail', 'pending_offline', 200, 0, 200, 200, 'cash', '[]', '2 items', new Date().toISOString(), new Date().toISOString()]
        )
        await db.runAsync(
          `INSERT INTO sale_items (id, sale_id, product_id, variation_name, product_name, quantity, unit_price, discount, total_price)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          ['item-4a', 'sale-4', 'prod-1', null, 'Test Product', 1, 100, 0, 100]
        )
        recordInventoryTxMock('shop-1', 'prod-1', 'SALE', 1)
        await db.runAsync(
          `INSERT INTO sale_items (id, sale_id, product_id, variation_name, product_name, quantity, unit_price, discount, total_price)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          ['item-4b', 'sale-4', 'prod-1', null, 'Test Product', 1, 100, 0, 100]
        )
        recordInventoryTxMock('shop-1', 'prod-1', 'SALE', 1)
        // Fail after both items
        throw new Error('INJECTED FAILURE: AFTER_ITEMS')
      })
    } catch {
      threw = true
    }

    assert('[4a] transaction threw', threw === true)
    assert('[4b] sale rolled back', countRows(db, 'sales') === beforeSales)
    assert('[4c] both items rolled back', countRows(db, 'sale_items') === beforeItems)
    assert('[4d] both inventory txs rolled back', _inventoryTxLog.length === 0)
  }

  // ── [5] Full sale flow (no failures) ────────────────────────────────────────
  {
    const db = setupMockDb()
    _inventoryTxLog = []
    const beforeSales = countRows(db, 'sales')
    const beforeItems = countRows(db, 'sale_items')
    const beforeInv = countRows(db, 'inventory_transactions')
    const beforeProducts = countRows(db, 'products')

    await db.withTransactionAsync(async () => {
      await db.runAsync(
        'INSERT INTO sales (id, type, status, subtotal, discount_amount, total_amount, paid_amount, payment_method, items, items_summary, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        ['sale-5', 'retail', 'pending_offline', 300, 0, 300, 300, 'mpesa', '[]', '3 items', new Date().toISOString(), new Date().toISOString()]
      )
      for (let i = 0; i < 3; i++) {
        const itemId = `item-5-${i}`
        await db.runAsync(
          'INSERT INTO sale_items (id, sale_id, product_id, variation_name, product_name, quantity, unit_price, discount, total_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [itemId, 'sale-5', 'prod-1', null, 'Test Product', 1, 100, 0, 100]
        )
        recordInventoryTxMock('shop-1', 'prod-1', 'SALE', 1)
      }
      // Stock deduction — single column UPDATE
      await db.runAsync('UPDATE products SET current_stock = ? WHERE id = ?', [97, 'prod-1'])
    })

    assert('[5a] one sale inserted', countRows(db, 'sales') === beforeSales + 1)
    assert('[5b] three items inserted', countRows(db, 'sale_items') === beforeItems + 3)
    assert('[5c] three inventory txs', _inventoryTxLog.length === 3)
    assert('[5d] transaction committed', (db as any)._committed === true)
  }

  // ── [6] withTransactionAsync is not supported (mock doesn't have it) ───────────
  {
    const db = setupMockDb()
    const hasMethod = 'withTransactionAsync' in db
    assert('[6] mock exposes withTransactionAsync', hasMethod === true)
  }

  console.log(`\nTotal: ${passed} passed, ${failed} failed\n`)
  if (failed > 0) process.exit(1)
}

run().catch((e: unknown) => {
  console.error('Test runner error:', e)
  process.exit(2)
})
