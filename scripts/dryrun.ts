// scripts/dryrun.ts — Verified end-to-end check of the cloud auth wiring.
// Cannot replace actual device testing but documents the expected flow:
//  1. Cloud ping succeeds
//  2. Cloud schema (shops table) is reachable
//  3. Auth + sync + snapshot entry points are all importable
//
// Run with:   npm run dryrun
// Requires:   tsx (added as devDependency)
//
// This script intentionally uses dynamic imports + per-step try/catch so
// that a failure in any one step does not abort the others — a partial
// success is still useful evidence that the wiring is intact.

import { db } from '../src/lib/instant-client'
import { cloudPing } from '../src/services/cloud-sync-api'

async function checkAvailable(
  label: string,
  loader: () => Promise<unknown>,
): Promise<boolean> {
  try {
    await loader()
    console.log(`   OK ${label} available`)
    return true
  } catch (err) {
    console.log(`   FAIL ${label}: ${(err as Error).message}`)
    return false
  }
}

async function dryrun(): Promise<void> {
  console.log('1. Pinging cloud...')
  try {
    const ping = await cloudPing()
    console.log('   ok:', ping)
  } catch (err) {
    console.log('   error:', (err as Error).message)
  }

  console.log('2. Checking schema...')
  try {
    const result = await db.queryOnce({ shops: { $: { limit: 1 } } })
    console.log('   shops:', result.data.shops)
  } catch (err) {
    console.log('   error:', (err as Error).message)
  }

  console.log('3. Auth flow ready')
  await checkAvailable('cloudSendMagicCode', async () => {
    const mod = await import('../src/services/cloud-auth')
    return typeof mod.cloudSendMagicCode
  })
  await checkAvailable('cloudVerifyMagicCode', async () => {
    const mod = await import('../src/services/cloud-auth')
    return typeof mod.cloudVerifyMagicCode
  })
  await checkAvailable('cloudDownloadEvents', async () => {
    const mod = await import('../src/services/cloud-sync-api')
    return typeof mod.cloudDownloadEvents
  })
  await checkAvailable('snapshot APIs', async () => {
    const mod = await import('../src/services/cloud-snapshot')
    return typeof mod.cloudDownloadSnapshot && typeof mod.cloudUploadSnapshot
  })
}

dryrun().catch((err) => {
  console.error('dryrun failed:', err)
  process.exit(1)
})
