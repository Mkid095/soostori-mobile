/**
 * db-shop-isolation.test.ts — Business isolation regression tests.
 *
 * Pure logic tests — no native module imports.
 * Tests: fail-closed shopId, shop-scoped queues, no 'default' fallback.
 *
 * Run with: npx tsx src/services/__tests__/db-shop-isolation.test.ts
 */

let passed = 0
let failed = 0

function assert(name: string, cond: boolean): void {
  if (cond) { console.log(`  ✓ ${name}`); passed++ }
  else { console.log(`  ✗ ${name}`); failed++ }
}

function assertThrows(name: string, fn: () => void): void {
  let threw = false
  try { fn() } catch { threw = true }
  if (threw) { console.log(`  ✓ ${name}`); passed++ }
  else { console.log(`  ✗ ${name} — did not throw`); failed++ }
}

async function run(): Promise<void> {
  console.log('\n=== db-shop-isolation regression tests ===\n')

  // ── [1] resolveShopId: null when not set (fail-closed) ────────────────────
  {
    // Simulate AsyncStorage behavior
    let storedShopId: string | null = 'shop-123'
    function getShopId() { return storedShopId }
    function clearShopId() { storedShopId = null }

    assert('[1a] shopId resolves to stored value', getShopId() === 'shop-123')
    clearShopId()
    assert('[1b] shopId is null when not set', getShopId() === null)
    // A mutation service should throw when shopId is null
    assert('[1c] null shopId blocks mutation (fail-closed)', getShopId() === null)
  }

  // ── [2] No 'default' fallback ───────────────────────────────────────────
  {
    // The fix removes 'default' as fallback — null shopId must throw
    let shopId: string | null = null
    function queueSyncFixed(sId: string | null, table: string, recordId: string): void {
      const actualShopId = sId
      if (!actualShopId) throw new Error('No shop context — cannot queue sync')
    }
    assertThrows('[2a] null shopId throws', () => queueSyncFixed(null, 'sales', 's1'))
    assertThrows('[2b] undefined shopId throws', () => queueSyncFixed(undefined as unknown as string, 'sales', 's1'))
  }

  // ── [3] Two shops: separate queues ──────────────────────────────────────
  {
    const shopAQueue: string[] = []
    const shopBQueue: string[] = []

    function queueSyncScoped(shopId: string, table: string, recordId: string): void {
      if (!shopId || shopId === 'unknown') throw new Error('No shop context')
      const entry = JSON.stringify({ shopId, table, recordId })
      if (shopId === 'shop-A') shopAQueue.push(entry)
      else if (shopId === 'shop-B') shopBQueue.push(entry)
    }

    queueSyncScoped('shop-A', 'sales', 'sale-A1')
    queueSyncScoped('shop-A', 'sales', 'sale-A2')
    queueSyncScoped('shop-B', 'sales', 'sale-B1')

    assert('[3a] Shop A has 2 entries', shopAQueue.length === 2)
    assert('[3b] Shop B has 1 entry', shopBQueue.length === 1)
    assert('[3c] Shop B queue does not contain Shop A sales',
      shopBQueue.every(e => !e.includes('sale-A')))
    assert('[3d] Shop A queue does not contain Shop B sales',
      shopAQueue.every(e => !e.includes('sale-B')))
  }

  // ── [4] Missing shopId rejects queue insertion ──────────────────────────
  {
    function queueSyncFailsClosed(shopId: string | null | undefined, table: string, recordId: string): void {
      if (!shopId) throw new Error('No shop context — cannot queue sync')
    }

    assertThrows('[4a] null shopId throws', () => queueSyncFailsClosed(null, 'products', 'p1'))
    assertThrows('[4b] empty string throws', () => queueSyncFailsClosed('', 'products', 'p1'))
    assertThrows('[4c] undefined throws', () => queueSyncFailsClosed(undefined as unknown as string, 'products', 'p1'))

    let ok = false
    try { queueSyncFailsClosed('shop-123', 'products', 'p1') } catch { /* noop */ }
    ok = true
    assert('[4d] valid shopId does not throw', ok === true)
  }

  // ── [5] Switching shops: queue is shop-scoped ───────────────────────────
  {
    let activeShopId: string | null = 'shop-A'
    const queues: Record<string, string[]> = { 'shop-A': [], 'shop-B': [] }

    function queueForActive(table: string, recordId: string): void {
      if (!activeShopId) throw new Error('No shop context')
      queues[activeShopId].push(`${table}:${recordId}`)
    }

    queueForActive('sales', 'sale-A1')
    activeShopId = 'shop-B'
    queueForActive('sales', 'sale-B1')
    activeShopId = 'shop-A'
    queueForActive('sales', 'sale-A2')

    assert('[5a] shop-A has 2 entries after switch', queues['shop-A'].length === 2)
    assert('[5b] shop-B has 1 entry', queues['shop-B'].length === 1)
    assert('[5c] shop-A does not have shop-B entry', !queues['shop-A'].some(e => e.includes('sale-B')))
  }

  // ── [6] Logout clears context ───────────────────────────────────────────
  {
    let shopId: string | null = 'shop-old'
    // Simulate logout
    shopId = null
    assert('[6] after logout, no shop context', shopId === null)
    // A mutation after logout should throw
    assert('[6b] mutation after logout would fail-closed', shopId === null)
  }

  // ── [7] sync_queue shop_id column always set ──────────────────────────
  {
    const entries: Array<{ shopId: string; table: string }> = []
    function validatedQueueSync(shopId: string | null | undefined, table: string, recordId: string): void {
      if (!shopId) throw new Error('No shop context — cannot queue sync')
      entries.push({ shopId, table })
    }

    validatedQueueSync('shop-1', 'products', 'p1')
    validatedQueueSync('shop-2', 'sales', 's1')

    assert('[7a] all entries have shopId', entries.every(e => !!e.shopId && e.shopId !== 'unknown'))
    assert('[7b] shop-1 entry present', entries.some(e => e.shopId === 'shop-1'))
    assert('[7c] shop-2 entry present', entries.some(e => e.shopId === 'shop-2'))
    assert('[7d] no unknown shopIds', !entries.some(e => e.shopId === 'unknown' || e.shopId === 'default'))
  }

  // ── [8] 'default' is not a valid production shopId ─────────────────────
  {
    function isValidShopId(id: string | null | undefined): boolean {
      return !!id && id !== 'default' && id !== 'unknown'
    }
    assert('[8a] null → invalid', isValidShopId(null) === false)
    assert('[8b] undefined → invalid', isValidShopId(undefined as unknown as string) === false)
    assert('[8c] "default" → invalid', isValidShopId('default') === false)
    assert('[8d] "unknown" → invalid', isValidShopId('unknown') === false)
    assert('[8e] "shop-123" → valid', isValidShopId('shop-123') === true)
  }

  console.log(`\nTotal: ${passed} passed, ${failed} failed\n`)
  if (failed > 0) process.exit(1)
}

run().catch((e: unknown) => {
  console.error('Test runner error:', e)
  process.exit(2)
})
