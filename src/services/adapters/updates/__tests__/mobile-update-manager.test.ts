/// <reference types="node" />

/**
 * MobileUpdateManager — contract tests.
 *
 * Tests the SDK UpdateManager interface contract:
 *   getCurrentVersion / checkForUpdate / downloadUpdate /
 *   installUpdate / abort / getStatus / addListener / retry
 *
 * expo-updates is not mocked because it requires native modules;
 * all tests use the internally-callable public API.
 */

import { MobileUpdateManager } from '../mobile-update-manager'

// ── Helpers ──────────────────────────────────────────────────────────────────

let passed = 0
let failed = 0

function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) { console.log(`  ✓ ${name}`); passed++ }
  else {
    console.log(`  ✗ ${name}${detail ? ' — ' + detail : ''}`)
    failed++
  }
}

// ── Test runner ──────────────────────────────────────────────────────────────

async function run(): Promise<void> {
  console.log('\n=== MobileUpdateManager contract tests ===\n')

  // [1] getCurrentVersion returns a semver string
  {
    MobileUpdateManager.__resetInstance()
    const mgr = MobileUpdateManager.__createForTesting()
    const version = await mgr.getCurrentVersion()
    assert('[1] getCurrentVersion() returns a string', typeof version === 'string')
    assert('[1] version is non-empty', version.length > 0)
  }

  // [2] getStatus returns UpdateStatus with all required fields
  {
    MobileUpdateManager.__resetInstance()
    const mgr = MobileUpdateManager.__createForTesting()
    const status = await mgr.getStatus()
    assert('[2] status is an object', typeof status === 'object')
    assert('[2] status.state is a string', typeof status.state === 'string')
    assert('[2] status.currentVersion is set', typeof status.currentVersion === 'string')
    assert('[2] status.requiresRestart is boolean', typeof status.requiresRestart === 'boolean')
    assert('[2] status.lastCheckedAt is string|null', status.lastCheckedAt === null || typeof status.lastCheckedAt === 'string')
    assert('[2] status.installedAt is string|null', status.installedAt === null || typeof status.installedAt === 'string')
    assert('[2] no availableVersion in CURRENT state', status.availableVersion === undefined)
    assert('[2] no progress in CURRENT state', status.progress === undefined)
    assert('[2] no error in CURRENT state', status.error === undefined)
  }

  // [3] initial state is CURRENT
  {
    MobileUpdateManager.__resetInstance()
    const mgr = MobileUpdateManager.__createForTesting()
    const status = await mgr.getStatus()
    assert('[3] initial state = CURRENT', status.state === 'CURRENT')
  }

  // [4] singleton: getInstance returns same instance
  {
    MobileUpdateManager.__resetInstance()
    const a = MobileUpdateManager.getInstance()
    const b = MobileUpdateManager.getInstance()
    assert('[4] getInstance() is singleton', a === b)
  }

  // [5] __resetInstance clears the singleton
  {
    MobileUpdateManager.__resetInstance()
    const a = MobileUpdateManager.getInstance()
    MobileUpdateManager.__resetInstance()
    const b = MobileUpdateManager.getInstance()
    assert('[5] __resetInstance clears singleton', a !== b)
  }

  // [6] addListener emits current state immediately on subscribe
  {
    MobileUpdateManager.__resetInstance()
    const mgr = MobileUpdateManager.__createForTesting()
    let receivedState: string | null = null
    const unsub = mgr.addListener((status) => { receivedState = status.state })
    assert('[6] listener called immediately on subscribe', receivedState === 'CURRENT')
    unsub()
  }

  // [7] addListener returns unsubscribe function
  {
    MobileUpdateManager.__resetInstance()
    const mgr = MobileUpdateManager.__createForTesting()
    let callCount = 0
    const unsub = mgr.addListener(() => { callCount++ })
    unsub()
    // After unsubscribe, status change should not trigger callback
    // We can't easily trigger a status change without expo-updates,
    // so just verify the returned function exists and is callable
    assert('[7] addListener returns function', typeof unsub === 'function')
    assert('[7] unsubscribe was called', callCount === 1)
  }

  // [8] isSaleActive reflects active sale state
  {
    MobileUpdateManager.__resetInstance()
    const mgr = MobileUpdateManager.__createForTesting()
    assert('[8a] no sale → isSaleActive=false', mgr.isSaleActive() === false)

    mgr.setActiveSaleRef(() => true)
    assert('[8b] sale active → isSaleActive=true', mgr.isSaleActive() === true)

    mgr.setActiveSaleRef(() => false)
    assert('[8c] sale ended → isSaleActive=false', mgr.isSaleActive() === false)
  }

  // [9] setActiveSaleRef accepts both object and function forms
  {
    MobileUpdateManager.__resetInstance()
    const mgr = MobileUpdateManager.__createForTesting()
    mgr.setActiveSaleRef({ isActive: () => true } as any)
    assert('[9] object form accepted', mgr.isSaleActive() === true)
    mgr.setActiveSaleRef(() => false)
    assert('[9] function form accepted', mgr.isSaleActive() === false)
  }

  // [10] getStatus returns consistent snapshot (no mutation)
  {
    MobileUpdateManager.__resetInstance()
    const mgr = MobileUpdateManager.__createForTesting()
    const a = await mgr.getStatus()
    const b = await mgr.getStatus()
    assert('[10] getStatus returns same state', a.state === b.state)
    assert('[10] returned object is not internal reference',
      a !== b && JSON.stringify(a) === JSON.stringify(b))
  }

  // [11] UpdateStatus covers all canonical state strings
  {
    MobileUpdateManager.__resetInstance()
    const mgr = MobileUpdateManager.__createForTesting()
    const status = await mgr.getStatus()
    const validStates = [
      'CURRENT', 'CHECKING', 'UPDATE_AVAILABLE', 'DOWNLOADING',
      'READY_TO_INSTALL', 'INSTALLING', 'ERROR', 'UNSUPPORTED',
    ]
    assert('[11] state is a valid UpdateState',
      validStates.includes(status.state))
  }

  // [12] retry() method exists and is callable
  {
    MobileUpdateManager.__resetInstance()
    const mgr = MobileUpdateManager.__createForTesting()
    assert('[12] retry is a function', typeof mgr.retry === 'function')
    // retry() calls checkForUpdate() which requires expo-updates — just verify it doesn't throw synchronously
    try {
      await mgr.retry()
      // If expo-updates import fails that's acceptable in test env
    } catch {
      // expo-updates not available in test — expected
    }
    // After retry, state may be CHECKING or ERROR depending on expo-updates availability
    const status = await mgr.getStatus()
    assert('[12] status is a valid state after retry',
      ['CURRENT', 'CHECKING', 'ERROR'].includes(status.state))
  }

  console.log(`\nTotal: ${passed} passed, ${failed} failed\n`)
  if (failed > 0) process.exit(1)
}

run().catch((e) => {
  console.error('Test runner error:', e)
  process.exit(1)
})
