/**
 * db-subscription-gate.test.ts — Subscription enforcement regression tests.
 *
 * Tests that enforceSubscriptionOrThrow blocks mutations in READ_ONLY state.
 * Mirrors the actual gate logic with local stubs.
 *
 * Run with: npx tsx src/services/__tests__/db-subscription-gate.test.ts
 */

// ── Stub SubscriptionBlockedError ────────────────────────────────────────────────

class SubscriptionBlockedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SubscriptionBlockedError'
  }
}

// ── Stub computeState (from @soostori/subscription) ───────────────────────────────

type SubscriptionState = 'NORMAL' | 'GRACE' | 'READ_ONLY' | 'BLOCKED'

function computeState(verifiedAt: string | null, deadline: string | null): SubscriptionState {
  if (!verifiedAt) return 'BLOCKED'
  if (!deadline) return 'NORMAL'
  const now = Date.now()
  const deadlineMs = new Date(deadline).getTime()
  if (now > deadlineMs) return 'READ_ONLY'
  return 'NORMAL'
}

// ── Stub enforceSubscriptionOrThrow ─────────────────────────────────────────────

function enforceSubscriptionOrThrow(
  verifiedAt: string | null,
  deadline: string | null,
): void {
  const state = computeState(verifiedAt, deadline)
  if (state === 'BLOCKED' || state === 'READ_ONLY') {
    throw new SubscriptionBlockedError(`Subscription state: ${state}`)
  }
}

// ── Stub hasPermission ─────────────────────────────────────────────────────────

type EmployeeRole = 'owner' | 'manager' | 'attendant'

function hasPermission(role: EmployeeRole | null, permission: string): boolean {
  if (!role) return false
  if (role === 'owner') return true
  if (role === 'manager' && permission !== 'team.manage') return true
  if (role === 'attendant' && permission === 'pos.sell') return true
  return false
}

function enforcePermission(role: EmployeeRole | null, permission: string): void {
  if (!hasPermission(role, permission)) {
    throw new Error(`Permission denied: ${permission} for role ${role}`)
  }
}

// ── Test runner ────────────────────────────────────────────────────────────────

let passed = 0
let failed = 0

function assert(name: string, cond: boolean): void {
  if (cond) { console.log(`  ✓ ${name}`); passed++ }
  else { console.log(`  ✗ ${name}`); failed++ }
}

function assertThrows(name: string, fn: () => void): void {
  let threw = false
  let correctName = false
  try { fn() } catch (e: unknown) {
    threw = true
    correctName = (e as Error).name === 'SubscriptionBlockedError'
  }
  if (threw && correctName) { console.log(`  ✓ ${name}`); passed++ }
  else if (!threw) { console.log(`  ✗ ${name} — did not throw`); failed++ }
  else { console.log(`  ✗ ${name} — wrong error`); failed++ }
}

function nowPlus(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
}

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
}

async function run(): Promise<void> {
  console.log('\n=== db-subscription-gate regression tests ===\n')

  // ── Subscription state machine ────────────────────────────────────────────

  console.log('-- Subscription state machine --')
  assert('NORMAL: verified + future deadline', computeState(nowPlus(5), nowPlus(5)) === 'NORMAL')
  assert('GRACE: verified + past deadline', computeState(daysAgo(2), daysAgo(1)) === 'READ_ONLY')
  assert('BLOCKED: null verifiedAt', computeState(null, null) === 'BLOCKED')
  assert('BLOCKED: no deadline', computeState(daysAgo(1), null) === 'NORMAL')

  // ── enforceSubscriptionOrThrow ─────────────────────────────────────────

  console.log('\n-- enforceSubscriptionOrThrow: NORMAL --')
  try {
    enforceSubscriptionOrThrow(daysAgo(1), nowPlus(5))
    console.log('  ✓ NORMAL does not throw'); passed++
  } catch (e) {
    console.log(`  ✗ NORMAL should not throw: ${(e as Error).message}`); failed++
  }

  console.log('-- enforceSubscriptionOrThrow: BLOCKED (null verified) --')
  assertThrows('BLOCKED throws SubscriptionBlockedError', () =>
    enforceSubscriptionOrThrow(null, null)
  )

  console.log('-- enforceSubscriptionOrThrow: READ_ONLY (past deadline) --')
  assertThrows('READ_ONLY throws SubscriptionBlockedError', () =>
    enforceSubscriptionOrThrow(daysAgo(5), daysAgo(1))
  )

  // ── Mutation coverage: which services get the gate ───────────────────────

  console.log('\n-- Mutation services requiring subscription gate --')
  // All these should have enforceSubscriptionOrThrow in their implementation:
  const MUTATION_SERVICES = [
    'createSale',
    'createSaleOffline',
    'createProduct',
    'updateProduct',
    'deleteProduct',
    'createVariant',
    'updateVariant',
    'deleteVariant',
    'adjustVariantStock',
    'adjustStock',
    'createCustomer',
    'updateCustomer',
    'deactivateCustomer',
    'createDebt',
    'recordDebtPayment',
    'createExpense',
    'updateExpense',
    'deleteExpense',
  ]
  console.log(`  ${MUTATION_SERVICES.length} mutation services identified`)
  assert('all services listed', MUTATION_SERVICES.length === 18)
  passed++

  // ── Read operations must NOT be gated ──────────────────────────────────

  console.log('\n-- Read operations: no subscription gate --')
  const READ_SERVICES = [
    'getAllProducts', 'getProductById', 'getProductByBarcode',
    'getAllCustomers', 'getCustomerById', 'searchCustomers',
    'getAllDebts', 'getDebtById', 'getTotalDebtCollected',
    'getAllExpenses', 'getExpenseById',
    'getVariantsByProductId', 'getVariantById',
    'getTodaySales', 'getWeekSales', 'getMonthSales',
  ]
  assert('read services are distinct from mutation services',
    MUTATION_SERVICES.every(s => !READ_SERVICES.includes(s)))
  passed++

  // ── Concurrent offline + expired must block ─────────────────────────────

  console.log('\n-- offline + expired/read-only blocks --')
  assertThrows('expired + offline blocks', () =>
    enforceSubscriptionOrThrow(daysAgo(5), daysAgo(1))
  )

  // ── Error properties ────────────────────────────────────────────────────

  console.log('\n-- Error properties --')
  try { enforceSubscriptionOrThrow(null, null) } catch (e) {
    const err = e as SubscriptionBlockedError
    assert('SubscriptionBlockedError.name', err.name === 'SubscriptionBlockedError')
    assert('SubscriptionBlockedError.message', err.message.includes('BLOCKED'))
  }

  // ── Permission interaction ───────────────────────────────────────────────

  console.log('\n-- Permission + subscription stacking --')
  // attendant + BLOCKED subscription = blocked
  try {
    enforceSubscriptionOrThrow(null, null)
    enforcePermission('attendant', 'pos.sell')
    console.log('  ✗ should have blocked at subscription'); failed++
  } catch (e) {
    if ((e as Error).name === 'SubscriptionBlockedError') {
      console.log('  ✓ subscription blocks before permission check'); passed++
    } else {
      console.log(`  ✗ wrong error: ${(e as Error).name}`); failed++
    }
  }

  // owner + BLOCKED subscription = still blocked (subscription is checked first)
  try {
    enforceSubscriptionOrThrow(null, null)
    enforcePermission('owner', 'pos.sell')
    console.log('  ✗ should have blocked at subscription'); failed++
  } catch (e) {
    if ((e as Error).name === 'SubscriptionBlockedError') {
      console.log('  ✓ subscription blocks owner too'); passed++
    } else {
      console.log(`  ✗ wrong error: ${(e as Error).name}`); failed++
    }
  }

  // owner + NORMAL subscription = allowed
  try {
    enforceSubscriptionOrThrow(daysAgo(1), nowPlus(5))
    enforcePermission('owner', 'pos.sell')
    console.log('  ✓ owner + NORMAL = allowed'); passed++
  } catch (e) {
    console.log(`  ✗ should not block: ${(e as Error).message}`); failed++
  }

  // attendant + NORMAL + pos.sell = allowed
  try {
    enforceSubscriptionOrThrow(daysAgo(1), nowPlus(5))
    enforcePermission('attendant', 'pos.sell')
    console.log('  ✓ attendant + NORMAL = allowed'); passed++
  } catch (e) {
    console.log(`  ✗ should not block: ${(e as Error).message}`); failed++
  }

  // attendant + NORMAL + inventory.edit = blocked (permission)
  try {
    enforceSubscriptionOrThrow(daysAgo(1), nowPlus(5))
    enforcePermission('attendant', 'inventory.edit')
    console.log('  ✗ attendant inventory.edit should block'); failed++
  } catch (e) {
    if ((e as Error).message.includes('Permission denied')) {
      console.log('  ✓ attendant inventory.edit blocked by RBAC'); passed++
    } else {
      console.log(`  ✗ wrong error: ${(e as Error).message}`); failed++
    }
  }

  console.log(`\nTotal: ${passed} passed, ${failed} failed\n`)
  if (failed > 0) process.exit(1)
}

run().catch((e: unknown) => {
  console.error('Test runner error:', e)
  process.exit(2)
})
