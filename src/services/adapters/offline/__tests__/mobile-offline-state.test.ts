/**
 * Mobile offline-state contract tests.
 */

import { asShopId } from '@soostori/core'
import { computeMobileOfflineState, MOBILE_OFFLINE_GRACE_DAYS } from '../mobile-offline-state'

let passed = 0
let failed = 0

function assert(name: string, cond: boolean): void {
  if (cond) { console.log(`  ✓ ${name}`); passed++ }
  else { console.log(`  ✗ ${name}`); failed++ }
}

async function run(): Promise<void> {
  console.log('\n=== Phase 11.3f Mobile offline-state contract tests ===\n')

  const shopId = asShopId('shop-1')
  const now = new Date('2026-09-05T00:00:00Z')

  assert('[1] MOBILE_OFFLINE_GRACE_DAYS = 3', MOBILE_OFFLINE_GRACE_DAYS === 3)

  // [2] Online → ONLINE
  {
    const s = computeMobileOfflineState({
      shopId, isOnline: true, lastVerifiedAt: new Date(now.getTime() - 1000).toISOString(), entitlement: null, now,
    })
    assert('[2] online → ONLINE', s.phase === 'ONLINE')
    assert('[2] canSell=true', s.canSell === true)
  }

  // [3] Offline < 2 days → OFFLINE_NORMAL
  {
    const s = computeMobileOfflineState({
      shopId, isOnline: false, lastVerifiedAt: new Date(now.getTime() - 12 * 3600 * 1000).toISOString(), entitlement: null, now,
    })
    assert('[3] offline < 1 day → OFFLINE_NORMAL', s.phase === 'OFFLINE_NORMAL')
  }

  // [4] Offline 2 days → OFFLINE_WARNING (preserves canSell=true)
  {
    const s = computeMobileOfflineState({
      shopId, isOnline: false, lastVerifiedAt: new Date(now.getTime() - 48 * 3600 * 1000).toISOString(), entitlement: null, now,
    })
    assert('[4] offline 2 days → OFFLINE_WARNING', s.phase === 'OFFLINE_WARNING')
    assert('[4] warning preserves canSell=true', s.canSell === true)
  }

  // [5] Offline ≥ 3 days → OFFLINE_LIMIT_EXCEEDED, canSell=false
  {
    const s = computeMobileOfflineState({
      shopId, isOnline: false, lastVerifiedAt: new Date(now.getTime() - 96 * 3600 * 1000).toISOString(), entitlement: null, now,
    })
    assert('[5] offline ≥ 3 days → OFFLINE_LIMIT_EXCEEDED', s.phase === 'OFFLINE_LIMIT_EXCEEDED')
    assert('[5] canSell=false when limit exceeded', s.canSell === false)
    assert('[5] daysUntilLimit = 0', s.daysUntilLimit === 0)
  }

  console.log(`\nTotal: ${passed} passed, ${failed} failed`)
  process.exit(failed === 0 ? 0 : 1)
}

run().catch((err: unknown) => {
  console.error('test runner failed:', err)
  process.exit(2)
})
