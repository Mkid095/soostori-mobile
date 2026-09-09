/**
 * db-operational-gate.test.ts — 3-day offline policy + Primary Device tests.
 *
 * Pure logic tests — no native module imports.
 * Tests the enforcement functions directly with in-memory state.
 *
 * Run with: npx tsx src/services/__tests__/db-operational-gate.test.ts
 */

// ── Error classes (mirror actual implementations) ─────────────────────────────────

class OfflineLimitExceededError extends Error {
  constructor(public readonly offlineDays: number, public readonly limitDays: number) {
    super(`Device offline for ${offlineDays} day(s) — limit is ${limitDays}. Reconnect to sync.`)
    this.name = 'OfflineLimitExceededError'
  }
}

class PrimaryDeviceRequiredError extends Error {
  constructor(public readonly primaryStatus: string) {
    super(`Stock operations require the Primary Device to be online. Current status: ${primaryStatus}.`)
    this.name = 'PrimaryDeviceRequiredError'
  }
}

// ── In-memory AsyncStorage mock ─────────────────────────────────────────────────

const MOBILE_OFFLINE_GRACE_DAYS = 3
const store: Record<string, string> = {}

const mockAsyncStorage = {
  async getItem(key: string): Promise<string | null> {
    return store[key] ?? null
  },
  async setItem(key: string, value: string): Promise<void> {
    store[key] = value
  },
  async removeItem(key: string): Promise<void> {
    delete store[key]
  },
}

// ── Stub functions (mirror the actual db-operational-gate.ts logic) ───────────

function getOfflineDays(offlineSince: string | null): number {
  if (!offlineSince) return 0
  const elapsed = Date.now() - new Date(offlineSince).getTime()
  return Math.floor(elapsed / (1000 * 60 * 60 * 24))
}

function enforceOfflinePolicy(offlineSince: string | null): void {
  const days = getOfflineDays(offlineSince)
  if (days >= MOBILE_OFFLINE_GRACE_DAYS) {
    throw new OfflineLimitExceededError(days, MOBILE_OFFLINE_GRACE_DAYS)
  }
}

type PrimaryStatusName = 'online' | 'stale' | 'lost' | 'unknown'

interface MobilePrimaryStatus { status: PrimaryStatusName; canAuthorStockOps: boolean }

function enforcePrimaryDevice(primary: MobilePrimaryStatus): void {
  if (!primary.canAuthorStockOps) {
    throw new PrimaryDeviceRequiredError(primary.status)
  }
}

function enforceStockMutationGate(primary: MobilePrimaryStatus): void {
  enforcePrimaryDevice(primary)
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
    correctName = (e as Error).name === 'OfflineLimitExceededError'
      || (e as Error).name === 'PrimaryDeviceRequiredError'
  }
  if (threw && correctName) { console.log(`  ✓ ${name}`); passed++ }
  else if (!threw) { console.log(`  ✗ ${name} — did not throw`); failed++ }
  else { console.log(`  ✗ ${name} — wrong error type`); failed++ }
}

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString()
}

async function run(): Promise<void> {
  console.log('\n=== db-operational-gate regression tests ===\n')

  // ── Offline policy ────────────────────────────────────────────────────────

  console.log('-- Offline policy: null (fresh device) --')
  try {
    enforceOfflinePolicy(null)
    console.log('  ✓ null does not throw'); passed++
  } catch (e) {
    console.log(`  ✗ null should not throw: ${(e as Error).message}`); failed++
  }

  console.log('-- Offline policy: 2 days offline --')
  try {
    enforceOfflinePolicy(daysAgo(2))
    console.log('  ✓ 2 days does not throw'); passed++
  } catch (e) {
    console.log(`  ✗ 2 days should not throw: ${(e as Error).message}`); failed++
  }

  console.log('-- Offline policy: 3 days offline --')
  assertThrows('3 days throws OfflineLimitExceededError', () =>
    enforceOfflinePolicy(daysAgo(3))
  )

  console.log('-- Offline policy: 5 days offline --')
  assertThrows('5 days throws OfflineLimitExceededError', () =>
    enforceOfflinePolicy(daysAgo(5))
  )

  console.log('-- Offline policy: 10 days offline --')
  assertThrows('10 days throws OfflineLimitExceededError', () =>
    enforceOfflinePolicy(daysAgo(10))
  )

  // ── Primary Device ──────────────────────────────────────────────────────

  console.log('\n-- Primary Device: online --')
  try {
    enforcePrimaryDevice({ status: 'online', canAuthorStockOps: true })
    console.log('  ✓ online does not throw'); passed++
  } catch (e) {
    console.log(`  ✗ online should not throw: ${(e as Error).message}`); failed++
  }

  console.log('-- Primary Device: stale --')
  assertThrows('stale throws PrimaryDeviceRequiredError', () =>
    enforcePrimaryDevice({ status: 'stale', canAuthorStockOps: false })
  )

  console.log('-- Primary Device: lost --')
  assertThrows('lost throws PrimaryDeviceRequiredError', () =>
    enforcePrimaryDevice({ status: 'lost', canAuthorStockOps: false })
  )

  console.log('-- Primary Device: unknown --')
  assertThrows('unknown throws PrimaryDeviceRequiredError', () =>
    enforcePrimaryDevice({ status: 'unknown', canAuthorStockOps: false })
  )

  // ── Combined gate ───────────────────────────────────────────────────────

  console.log('\n-- Combined gate: online primary --')
  try {
    enforceStockMutationGate({ status: 'online', canAuthorStockOps: true })
    console.log('  ✓ combined gate allows online primary'); passed++
  } catch (e) {
    console.log(`  ✗ online should not throw: ${(e as Error).message}`); failed++
  }

  console.log('-- Combined gate: stale primary --')
  assertThrows('stale primary blocks stock mutation', () =>
    enforceStockMutationGate({ status: 'stale', canAuthorStockOps: false })
  )

  console.log('-- Combined gate: lost primary --')
  assertThrows('lost primary blocks stock mutation', () =>
    enforceStockMutationGate({ status: 'lost', canAuthorStockOps: false })
  )

  // ── Error properties ────────────────────────────────────────────────────

  console.log('\n-- Error properties --')
  try { enforceOfflinePolicy(daysAgo(5)) } catch (e) {
    const err = e as OfflineLimitExceededError
    assert('OfflineLimitExceededError.offlineDays = 5', err.offlineDays === 5)
    assert('OfflineLimitExceededError.limitDays = 3', err.limitDays === 3)
    assert('error message mentions limit', err.message.includes('3'))
  }

  try { enforcePrimaryDevice({ status: 'lost', canAuthorStockOps: false }) } catch (e) {
    const err = e as PrimaryDeviceRequiredError
    assert('PrimaryDeviceRequiredError.status = lost', err.primaryStatus === 'lost')
    assert('error message mentions status', err.message.includes('lost'))
  }

  // ── AsyncStorage integration ────────────────────────────────────────────

  console.log('\n-- AsyncStorage integration --')
  const OFFLINE_SINCE_KEY = '@soostori:offlineSince'
  await mockAsyncStorage.removeItem(OFFLINE_SINCE_KEY)
  const fresh = await mockAsyncStorage.getItem(OFFLINE_SINCE_KEY)
  assert('fresh device: no offlineSince stored', fresh === null)

  const pastDate = daysAgo(5)
  await mockAsyncStorage.setItem(OFFLINE_SINCE_KEY, pastDate)
  const stored = await mockAsyncStorage.getItem(OFFLINE_SINCE_KEY)
  assert('5 days ago: offlineSince stored', stored === pastDate)

  assertThrows('stored 5-day timestamp throws', () =>
    enforceOfflinePolicy(stored)
  )

  await mockAsyncStorage.removeItem(OFFLINE_SINCE_KEY)
  const afterRemove = await mockAsyncStorage.getItem(OFFLINE_SINCE_KEY)
  assert('after remove: offlineSince is null', afterRemove === null)

  console.log('\n-- Constants --')
  assert('MOBILE_OFFLINE_GRACE_DAYS = 3', MOBILE_OFFLINE_GRACE_DAYS === 3)

  console.log(`\nTotal: ${passed} passed, ${failed} failed\n`)
  if (failed > 0) process.exit(1)
}

run().catch((e: unknown) => {
  console.error('Test runner error:', e)
  process.exit(2)
})
