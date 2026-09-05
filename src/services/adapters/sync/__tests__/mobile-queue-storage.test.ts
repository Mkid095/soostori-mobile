/**
 * MobileOfflineSync + MobileQueueStorage — SDK contract verification.
 *
 * Phase 11.4 (Mobile Sync Migration). Each scenario uses an isolated stub
 * so behaviour is deterministic and test ordering doesn't leak state.
 */

import { createEvent, SALE_PENDING, PRODUCT_UPDATED, type SoostoriEventName } from '@soostori/events'

import {
  MobileOfflineSync,
  __setMobileQueueStorageDbForTesting,
} from '../mobile-offline-queue'

let passed = 0
let failed = 0

function assert(name: string, cond: boolean): void {
  if (cond) { console.log(`  ✓ ${name}`); passed++ }
  else { console.log(`  ✗ ${name}`); failed++ }
}

interface LegacyRow {
  id: string
  shop_id: string
  table_name: string
  action: 'create' | 'update' | 'delete'
  payload: string
  status: string
  created_at: number
  retry_count: number
  retry_at: number | null
}

function makeStub() {
  const rows: LegacyRow[] = []
  return {
    rows,
    async listLegacyRows(): Promise<LegacyRow[]> { return rows },
    async writeLegacyRow(row: LegacyRow): Promise<void> {
      const i = rows.findIndex((r) => r.id === row.id)
      if (i >= 0) rows[i] = row
      else rows.push(row)
    },
    async deleteLegacyRow(id: string): Promise<void> {
      const i = rows.findIndex((r) => r.id === id)
      if (i >= 0) rows.splice(i, 1)
    },
    async pruneLegacySent(): Promise<void> {
      for (let i = rows.length - 1; i >= 0; i--) {
        if (rows[i].status === 'sent') rows.splice(i, 1)
      }
    },
  }
}

function makeEvent(name: string, entity: string, id: string) {
  return createEvent({
    name: name as SoostoriEventName,
    shopId: 'shop-1' as never,
    deviceId: 'device-mobile' as never,
    entityId: id as never,
    entity,
    payload: { total: 100 },
  })
}

async function runScenario(name: string, scenario: () => Promise<void>): Promise<void> {
  console.log(`\n--- Scenario ${name} ---`)
  const stub = makeStub()
  __setMobileQueueStorageDbForTesting(stub as never)
  const sync = new MobileOfflineSync()
  await scenario.call({ sync, stub })
}

interface Ctx {
  sync: MobileOfflineSync
  stub: ReturnType<typeof makeStub>
}

async function run(): Promise<void> {
  console.log('\n=== Phase 11.4 MobileOfflineSync contract tests ===\n')

  // ── Scenario 1: enqueue persists a SALE_PENDING canonical event. ──
  await runScenario('enqueue SALE_PENDING → SALE_PENDING roundtrip', async function (this: Ctx) {
    const evt = makeEvent(SALE_PENDING, 'sales', 'sale-1')
    const item = await this.sync.enqueue(evt)
    assert('[1] enqueue returns OfflineQueueItem with id', Boolean(item.id))
    assert('[1] enqueue persists to legacy table', this.stub.rows.length === 1)
    assert('[1] legacy table_name is "sales"', this.stub.rows[0].table_name === 'sales')

    const pending = await this.sync.pending()
    assert('[1] pending() returns 1 item', pending.length === 1)
    assert('[1] pending[0] event name is canonical SALE_PENDING', pending[0].event.name === SALE_PENDING)
  } as (this: Ctx) => Promise<void>)

  // ── Scenario 2: product event maps to products table. ─────────────
  await runScenario('enqueue PRODUCT_UPDATED → products table', async function (this: Ctx) {
    const evt = makeEvent(PRODUCT_UPDATED, 'products', 'product-1')
    await this.sync.enqueue(evt)
    assert('[2] product event maps to products table', this.stub.rows[0].table_name === 'products')
    assert('[2] product event action=update', this.stub.rows[0].action === 'update')
  } as (this: Ctx) => Promise<void>)

  // ── Scenario 3: markSent transitions pending → sent. ─────────────
  await runScenario('markSent transitions status to sent', async function (this: Ctx) {
    const evt = makeEvent(SALE_PENDING, 'sales', 'sale-x')
    const item = await this.sync.enqueue(evt)
    await this.sync.markSent(item.id)
    assert('[3] legacy row status updated to sent', this.stub.rows[0].status === 'sent')
  } as (this: Ctx) => Promise<void>)

  // ── Scenario 4: markFailed sets status + retry counter. ───────────
  await runScenario('markFailed sets status=failed + retryCount', async function (this: Ctx) {
    const evt = makeEvent(SALE_PENDING, 'sales', 'sale-y')
    const item = await this.sync.enqueue(evt)
    await this.sync.markFailed(item.id, 'connection lost')
    const row = this.stub.rows.find((r) => r.id === item.id)
    assert('[4] status=failed after markFailed', row?.status === 'failed')
    assert('[4] retry_count incremented to 1', row?.retry_count === 1)
  } as (this: Ctx) => Promise<void>)

  // ── Scenario 5: purge() removes sent items only. ────────────────
  await runScenario('purge() removes sent items only', async function (this: Ctx) {
    const evt1 = makeEvent(SALE_PENDING, 'sales', 'sale-a')
    const evt2 = makeEvent(SALE_PENDING, 'sales', 'sale-b')
    const a = await this.sync.enqueue(evt1)
    await this.sync.enqueue(evt2)
    await this.sync.markSent(a.id)
    // item b remains pending
    await this.sync.purge()
    assert('[5] pruneSent removed sent item', this.stub.rows.length === 1)
    assert('[5] pending row preserved', this.stub.rows[0].id !== a.id)
  } as (this: Ctx) => Promise<void>)

  // ── Scenario 6: idempotency — same idempotency key, enqueue twice ──
  await runScenario('idempotency on dedupe-key (records only uniquely via id)', async function (this: Ctx) {
    const evt = makeEvent(SALE_PENDING, 'sales', 'sale-d')
    await this.sync.enqueue(evt)
    await this.sync.enqueue(evt)
    assert('[6] two enqueues produce two distinct row ids', this.stub.rows.length === 2)
    assert('[6] both rows share the same canonical event name', this.stub.rows.every((r) => r.table_name === 'sales'))
  } as (this: Ctx) => Promise<void>)

  console.log(`\nTotal: ${passed} passed, ${failed} failed`)
  process.exit(failed === 0 ? 0 : 1)
}

run().catch((err: unknown) => {
  console.error('test runner failed:', err)
  process.exit(2)
})
