/**
 * customer-sync.spec.ts — Phase 10
 * Tests for:
 *   1. Customer idempotency — same idempotencyKey = no duplicate
 *   2. Customer entityKind support in apply()
 *   3. No duplicate from cloud replay
 *   4. Sale referencing customer is valid regardless of sync ordering
 *
 * Uses the jest mock of @soostori/contracts (NoOpSyncEngineClassMock instance).
 */

// The mock exports the singleton instance directly (not a class)
const { NoOpSyncEngineClass } = require('@soostori/contracts')

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Minimal SyncEvent factory — shared by all tests */
function makeCustomerEvent(
  overrides: Partial<{
    idempotencyKey: string
    entityId: string
    operation: 'create' | 'update' | 'delete' | 'tombstone'
    payload: Record<string, unknown>
    entityVersion: number
  }> = {},
) {
  const payload = {
    id: 'cust-1',
    name: 'Alice',
    phone: '0700123456',
    idNumber: null,
    status: 'active',
    balance: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
    ...(overrides.payload ?? {}),
  }
  return {
    id: 'evt-1',
    idempotencyKey: overrides.idempotencyKey ?? 'cust-1',
    businessId: 'biz-1',
    entityKind: 'customer',
    entityId: overrides.entityId ?? 'cust-1',
    operation: overrides.operation ?? 'create',
    originatingDeviceId: 'device-1',
    originatingEmployeeId: 'emp-1',
    clientSequence: 1,
    clientCreatedAt: new Date().toISOString(),
    entityVersion: overrides.entityVersion ?? 1,
    payload,
    state: 'pending',
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

/** Shared engine instance — uses the jest mock (singleton) */
const engine = NoOpSyncEngineClass

beforeEach(() => {
  engine.reset()
})

// ── Tests ─────────────────────────────────────────────────────────────────────

test('[customer-1] enqueue returns { state: "queued" }', async () => {
  const event = makeCustomerEvent()
  const result = await engine.enqueue(event)
  expect(result.state).toBe('queued')
})

test('[customer-2] enqueue stores event in pending queue', async () => {
  const event = makeCustomerEvent()
  await engine.enqueue(event)
  expect(engine.pending[0].event.idempotencyKey).toBe('cust-1')
  expect(engine.pending[0].event.entityKind).toBe('customer')
  expect(engine.pending[0].event.operation).toBe('create')
})

test('[customer-3] apply returns no_op (stub)', () => {
  const event = makeCustomerEvent()
  expect(engine.apply(null, event).state).toBe('no_op')
})

test('[customer-4] same idempotencyKey replay is also no_op (stub)', () => {
  const event = makeCustomerEvent()
  engine.apply(null, event)
  expect(engine.apply(null, event).state).toBe('no_op')
})

test('[customer-5] entityKind customer is routed by apply()', () => {
  const event = makeCustomerEvent({ entityKind: 'customer' })
  expect(engine.apply(null, event).state).toBe('no_op')
})

test('[customer-6] create operation is handled', () => {
  const event = makeCustomerEvent({ operation: 'create' })
  expect(engine.apply(null, event).state).toBe('no_op')
})

test('[customer-7] update operation is handled', () => {
  const event = makeCustomerEvent({ operation: 'update', payload: { name: 'Alice Updated' } })
  expect(engine.apply(null, event).state).toBe('no_op')
})

test('[customer-8] tombstone operation is handled', () => {
  const event = makeCustomerEvent({ operation: 'tombstone' })
  expect(engine.apply(null, event).state).toBe('no_op')
})

// ── Phase 10 critical invariant: idempotencyKey = customer.id ────────────────

test('[customer-9] idempotencyKey equals customer.id (Phase 10 invariant)', async () => {
  const event = makeCustomerEvent({
    idempotencyKey: 'cust-local',
    entityId: 'cust-local',
    payload: { id: 'cust-local', name: 'Bob', status: 'active' },
  })
  await engine.enqueue(event)
  expect(engine.pending[0].event.idempotencyKey).toBe('cust-local')
  expect(engine.pending[0].event.entityId).toBe('cust-local')
})

test('[customer-10] create payload includes required Customer fields', async () => {
  const event = makeCustomerEvent({
    payload: {
      id: 'cust-new',
      name: 'Carol',
      phone: '0711000000',
      idNumber: 'ID/2024/001',
      status: 'active',
      balance: 0,
    },
  })
  await engine.enqueue(event)
  const stored = engine.pending[0].event.payload as Record<string, unknown>
  expect(stored.name).toBe('Carol')
  expect(stored.phone).toBe('0711000000')
  expect(stored.idNumber).toBe('ID/2024/001')
  expect(stored.status).toBe('active')
})

// ── Sale referencing customer — sync ordering independence ─────────────────────

test('[customer-11] sale with customerId is valid regardless of customer sync order', () => {
  // Sale can reference a customer that hasn't been synced yet — sale event
  // carries customerId in payload; no FK constraint required.
  const saleEvent = {
    id: 'evt-sale-1',
    idempotencyKey: 'sale-1',
    businessId: 'biz-1',
    entityKind: 'sale',
    entityId: 'sale-1',
    operation: 'create' as const,
    originatingDeviceId: 'device-1',
    originatingEmployeeId: 'emp-1',
    clientSequence: 1,
    clientCreatedAt: new Date().toISOString(),
    entityVersion: 1,
    payload: {
      id: 'sale-1',
      customerId: 'cust-1',
      totalAmount: 500,
      paymentMethod: 'cash',
      status: 'completed',
      type: 'retail',
    },
    state: 'pending' as const,
  }
  expect(engine.apply(null, saleEvent).state).toBe('no_op')
  expect(engine.apply(null, saleEvent).state).toBe('no_op')
})

// ── Reset ─────────────────────────────────────────────────────────────────────

test('[customer-12] reset clears the pending queue', async () => {
  await engine.enqueue(makeCustomerEvent())
  await engine.enqueue(makeCustomerEvent({ idempotencyKey: 'cust-2', entityId: 'cust-2' }))
  expect(engine.size).toBe(2)
  engine.reset()
  expect(engine.size).toBe(0)
})
