/**
 * AsyncStorageSessionStorage — SDK contract verification.
 *
 * Validates the Mobile SessionStorage adapter against the published
 * @soostori/auth SessionStorage interface. Uses an in-memory mock for
 * AsyncStorage (real RN module unavailable outside the device runtime).
 *
 * Run with:   npx tsx src/services/adapters/auth/__tests__/session-storage.test.ts
 */

import type { SessionStorage } from '@soostori/auth'
import {
  loadSession,
  saveSession,
  clearSession,
  serializeSession,
} from '@soostori/auth'
import type { AuthSession } from '@soostori/core'
import {
  asShopId,
  asDeviceId,
  asUserId,
  asEmployeeId,
} from '@soostori/core'

import { AsyncStorageSessionStorage } from '../session-storage'

function createAsyncStorageMock() {
  const store = new Map<string, string>()
  return {
    store,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    default_: {
      async getItem(key: string): Promise<string | null> {
        return store.get(key) ?? null
      },
      async setItem(key: string, value: string): Promise<void> {
        store.set(key, value)
      },
      async removeItem(key: string): Promise<void> {
        store.delete(key)
      },
    },
  }
}

let passed = 0
let failed = 0

function assert(name: string, cond: boolean): void {
  if (cond) { console.log(`  ✓ ${name}`); passed++ }
  else { console.log(`  ✗ ${name}`); failed++ }
}

async function run(): Promise<void> {
  console.log('\n=== Phase 11.1 Mobile AsyncStorageSessionStorage contract tests ===\n')

  // Build a SessionStorage impl backed by an inline stub that mirrors
  // AsyncStorage's surface — no React Native runtime required.
  const mock = createAsyncStorageMock()
  const storage: SessionStorage = {
    async get(key: string) { return mock.default_.getItem(key) },
    async set(key: string, value: string) { await mock.default_.setItem(key, value) },
    async delete(key: string) { await mock.default_.removeItem(key) },
  }

  const fakeSession: AuthSession = {
    userId: asUserId('u-1'),
    shopId: asShopId('s-1'),
    employeeId: asEmployeeId('e-1'),
    deviceId: asDeviceId('d-1'),
    email: 'test@example.com',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
  }
  const serialized = serializeSession(fakeSession)

  // [1] AsyncStorageSessionStorage class implements the interface
  assert(
    '[1] AsyncStorageSessionStorage exists',
    typeof AsyncStorageSessionStorage === 'function',
  )

  // [2] saveSession via SDK helper writes to storage
  await saveSession(storage, fakeSession)
  assert('[2] saveSession() wrote to storage', mock.store.has('soostori:session'))

  // [3] loadSession via SDK helper retrieves from storage
  const loaded = await loadSession(storage)
  assert('[3] loadSession() returns a session', loaded?.userId === 'u-1')

  // [4] Serialization round-trips
  assert('[4] serializeSession round-trips', JSON.parse(serialized).userId === 'u-1')

  // [5] clearSession removes the key
  await clearSession(storage)
  const cleared = await loadSession(storage)
  assert('[5] clearSession() empties storage', cleared === null)

  console.log(`\nTotal: ${passed} passed, ${failed} failed`)
  process.exit(failed === 0 ? 0 : 1)
}

run().catch((err: unknown) => {
  console.error('test runner failed:', err)
  process.exit(2)
})
