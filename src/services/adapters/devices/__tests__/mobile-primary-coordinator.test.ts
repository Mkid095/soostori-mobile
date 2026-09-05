/**
 * Mobile Primary Device coordinator — SDK contract verification.
 */

import {
  initMobilePrimaryCoordinator,
  ingestPrimaryHeartbeat,
  tickMobilePrimary,
  getMobilePrimaryStatus,
  MOBILE_PRIMARY_THRESHOLDS,
} from '../mobile-primary-coordinator'

let passed = 0
let failed = 0

function assert(name: string, cond: boolean): void {
  if (cond) { console.log(`  ✓ ${name}`); passed++ }
  else { console.log(`  ✗ ${name}`); failed++ }
}

async function run(): Promise<void> {
  console.log('\n=== Phase 11.3e MobilePrimaryCoordinator contract tests ===\n')

  // [1] Threshold constants preserved.
  assert('[1] STALE_MS = 15_000', MOBILE_PRIMARY_THRESHOLDS.STALE_MS === 15_000)
  assert('[1] LOST_MS = 60_000', MOBILE_PRIMARY_THRESHOLDS.LOST_MS === 60_000)

  // [2] Pre-init: unknown/denied.
  assert('[2] pre-init status = unknown', getMobilePrimaryStatus().status === 'unknown')
  assert('[2] pre-init canAuthorStockOps = false', getMobilePrimaryStatus().canAuthorStockOps === false)

  // [3] Init + fresh heartbeat → ONLINE, can author.
  initMobilePrimaryCoordinator({ shopId: 'shop-1', deviceId: 'device-mobile' })
  ingestPrimaryHeartbeat('primary-device', Date.now())
  tickMobilePrimary()
  const s1 = getMobilePrimaryStatus()
  assert('[3] client+fresh heartbeat = online', s1.status === 'online')
  assert('[3] canAuthorStockOps = true', s1.canAuthorStockOps === true)

  // [4] Heartbeat 20s old → STALE / deny.
  ingestPrimaryHeartbeat('primary-device', Date.now() - 20_000)
  tickMobilePrimary()
  const s2 = getMobilePrimaryStatus()
  assert('[4] 20s-old heartbeat = stale', s2.status === 'stale')
  assert('[4] stale canAuthorStockOps = false', s2.canAuthorStockOps === false)

  // [5] Refresh → ONLINE then 65s old → LOST / deny.
  ingestPrimaryHeartbeat('primary-device', Date.now())
  tickMobilePrimary()
  assert('[5a] refresh to online', getMobilePrimaryStatus().status === 'online')

  ingestPrimaryHeartbeat('primary-device', Date.now() - 65_000)
  tickMobilePrimary()
  const s3 = getMobilePrimaryStatus()
  assert('[5] 65s-old heartbeat = lost', s3.status === 'lost')
  assert('[5] lost canAuthorStockOps = false', s3.canAuthorStockOps === false)

  // [6] Re-fresh remains online.
  ingestPrimaryHeartbeat('primary-device', Date.now())
  tickMobilePrimary()
  assert('[6] re-fresh heartbeat remains online', getMobilePrimaryStatus().status === 'online')

  console.log(`\nTotal: ${passed} passed, ${failed} failed`)
  process.exit(failed === 0 ? 0 : 1)
}

run().catch((err: unknown) => {
  console.error('test runner failed:', err)
  process.exit(2)
})
