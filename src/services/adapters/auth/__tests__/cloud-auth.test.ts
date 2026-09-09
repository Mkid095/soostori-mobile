/**
 * CloudAuth SDK Integration Tests — @soostori/auth@0.1.0-alpha.3
 *
 * Tests the SDK CloudAuth class with a mock platform adapter and mock API client.
 * Does NOT test real Google OAuth or real backend — those need real credentials
 * and a configured auth service.
 *
 * Run with: npx tsx src/services/adapters/auth/__tests__/cloud-auth.test.ts
 */

import { CloudAuth } from '@soostori/auth'
import type {
  PlatformAuthAdapter,
  AuthApiClient,
  AuthEvent,
  StoredSession,
  GoogleSignInResult,
  SignInResult,
  TrustedDevice,
} from '@soostori/auth'

// ── Mock SecureStorage ─────────────────────────────────────────────────────────

function createMockSecureStorage() {
  const store = new Map<string, string>()
  return {
    store,
    storage: {
      async get(key: string) { return store.get(key) ?? null },
      async set(key: string, value: string) { store.set(key, value) },
      async delete(key: string) { store.delete(key) },
    },
  }
}

// ── Mock NetworkStatus ────────────────────────────────────────────────────────

function createMockNetworkStatus(initial = { isOnline: true }) {
  let status = { ...initial }
  return {
    get() { return status },
    setOnline() { status = { isOnline: true } },
    setOffline() { status = { isOnline: false } },
  }
}

// ── TestDoubleCloudAuth — subclass that implements the protected storage hooks ───

class TestDoubleCloudAuth extends CloudAuth {
  private _testStore = new Map<string, StoredSession>()

  constructor(platform: PlatformAuthAdapter, api: AuthApiClient) {
    super(platform, api)
  }

  protected override async _saveStoredSession(session: StoredSession): Promise<void> {
    this._testStore.set('soostori:session', session)
  }

  protected override async _loadStoredSession(): Promise<StoredSession | null> {
    return this._testStore.get('soostori:session') ?? null
  }

  protected override async _clearStoredSession(): Promise<void> {
    this._testStore.delete('soostori:session')
  }
}

// ── Mock PlatformAdapter ──────────────────────────────────────────────────────

function createMockPlatformAdapter(secureStorage: ReturnType<typeof createMockSecureStorage>, net: ReturnType<typeof createMockNetworkStatus>) {
  return {
    openOAuthBrowser: async (_url: string) => { /* no-op for tests */ },
    getSecureStorage() { return secureStorage.storage },
    getNetworkStatus() { return net.get() },
    randomString(byteLength: number): string {
      const arr = new Uint8Array(byteLength)
      // Use Math.random as stand-in for crypto.getRandomValues in test env
      for (let i = 0; i < byteLength; i++) arr[i] = Math.floor(Math.random() * 256)
      return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
    },
  }
}

// ── Mock AuthApiClient ────────────────────────────────────────────────────────

function createMockApiClient() {
  return {
    exchangeGoogleCode: async (_code: string, _verifier: string, _uri: string) => ({ data: undefined, error: undefined }),
    linkGoogleAccount: async (_token: string, _access: string) => ({ data: undefined, error: undefined }),
    registerEmail: async (_email: string, _pw: string, _name: string) => ({ data: undefined, error: undefined }),
    verifyEmail: async (_token: string) => ({ data: undefined, error: undefined }),
    requestPasswordReset: async (_email: string) => ({ data: undefined, error: undefined }),
    completePasswordReset: async (_token: string, _pw: string) => ({ data: undefined, error: undefined }),
    signInEmail: async (_email: string, _pw: string): Promise<{ data?: SignInResult; error?: { code: string; message: string } }> => ({ data: undefined, error: undefined }),
    refreshSession: async (_token: string) => ({ data: undefined, error: undefined }),
    revokeSession: async (_token: string) => ({ data: undefined, error: undefined }),
    registerTrustedDevice: async (_token: string, _name: string, _access: string) => ({ data: undefined, error: undefined }),
    listTrustedDevices: async (_token: string) => ({ data: undefined, error: undefined }),
    removeTrustedDevice: async (_id: string, _token: string) => ({ data: undefined, error: undefined }),
  }
}

// ── Test helpers ──────────────────────────────────────────────────────────────

let passed = 0
let failed = 0

function assert(name: string, cond: boolean): void {
  if (cond) { console.log(`  ✓ ${name}`); passed++ }
  else { console.log(`  ✗ ${name}`); failed++ }
}

function assertEq(name: string, a: unknown, b: unknown): void {
  const ok = a === b
  if (ok) { console.log(`  ✓ ${name}`); passed++ }
  else { console.log(`  ✗ ${name} — got ${JSON.stringify(a)}, expected ${JSON.stringify(b)}`); failed++ }
}

async function run(): Promise<void> {
  console.log('\n=== CloudAuth SDK Integration Tests (@soostori/auth alpha.3) ===\n')

  // ── Test 1: SDK version resolves ─────────────────────────────────────────
  {
    const pkg = await import('@soostori/auth')
    const version = (pkg as unknown as { DEFAULT_SESSION_TTL_MS?: number }).DEFAULT_SESSION_TTL_MS
    assert('[1] SDK exports CloudAuth', typeof CloudAuth === 'function')
    assert('[1] SDK exports DEFAULT_SESSION_TTL_MS (7 days)', version === 7 * 24 * 60 * 60 * 1000)
    assert('[1] SESSION_STALE_THRESHOLD_MS = 24h',
      (pkg as unknown as { SESSION_STALE_THRESHOLD_MS?: number }).SESSION_STALE_THRESHOLD_MS === 24 * 60 * 60 * 1000)
  }

  // ── Test 2: RN/Metro-safe — no Node crypto in cloud-auth ────────────────
  {
    const fs = await import('fs')
    const cloudAuthSrc = fs.readFileSync(
      './node_modules/@soostori/auth/dist/cloud-auth.js', 'utf8'
    )
    assert('[2] No node:crypto in cloud-auth', !cloudAuthSrc.includes('node:crypto'))
    assert('[2] No require("crypto") in cloud-auth', !cloudAuthSrc.includes('require("crypto")'))
    assert('[2] No pbkdf2Sync in cloud-auth', !cloudAuthSrc.includes('pbkdf2Sync'))
  }

  // ── Test 3: CloudAuth instantiates with valid adapters ──────────────────
  {
    const secure = createMockSecureStorage()
    const net = createMockNetworkStatus()
    const platform = createMockPlatformAdapter(secure, net)
    const api = createMockApiClient()
    const auth = new TestDoubleCloudAuth(platform, api)
    assert('[3] CloudAuth instance created', typeof auth === 'object')
    assert('[3] hasValidSession = false (no session)', auth.hasValidSession === false)
    assert('[3] isSessionStale = true (no session)', auth.isSessionStale === true)
    assert('[3] session is null', auth.session === null)
  }

  // ── Test 4: Email sign-in → SIGNED_IN event ─────────────────────────────
  {
    const secure = createMockSecureStorage()
    const net = createMockNetworkStatus({ isOnline: true })
    const platform = createMockPlatformAdapter(secure, net)
    const mockResult: SignInResult = {
      userId: 'u-test-1' as any,
      employeeId: 'e-test-1' as any,
      email: 'test@example.com',
      accessToken: 'access-token-123',
      refreshToken: 'refresh-token-456',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      isEmailVerified: true,
      session: {} as any,
    }
    const api = createMockApiClient()
    // Override signInEmail for this test
    ;(api as any).signInEmail = async () => ({ data: mockResult, error: undefined })

    const auth = new TestDoubleCloudAuth(platform, api)
    let eventFired: AuthEvent | null = null
    auth.on((e) => { eventFired = e })

    const result = await auth.signInWithEmail('test@example.com', 'password123')
    assert('[4] signInWithEmail returns ok:true', result.ok === true)
    assert('[4] SIGNED_IN event fired', eventFired !== null)
    assert('[4] SIGNED_IN event type correct', (eventFired as AuthEvent | null)?.type === 'SIGNED_IN')
    assert('[4] session stored in memory', auth.session !== null)
    assert('[4] hasValidSession = true after login', auth.hasValidSession === true)
    assert('[4] isSessionStale = false after login', auth.isSessionStale === false)
  }

  // ── Test 5: Offline cached session — still valid within 24h ─────────────
  {
    const secure = createMockSecureStorage()
    const net = createMockNetworkStatus({ isOnline: true })

    // Pre-store a valid session
    const now = new Date().toISOString()
    const storedSession: StoredSession = {
      userId: 'u-offline-1',
      employeeId: 'e-offline-1',
      shopId: 's-offline-1',
      deviceId: 'd-offline-1',
      email: 'offline@example.com',
      accessToken: 'cached-access',
      refreshToken: 'cached-refresh',
      createdAt: now,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      lastValidatedAt: now,
    }

    const platform = createMockPlatformAdapter(secure, net)
    const api = createMockApiClient()

    // Override restoreSession to return the pre-stored session
    const auth = new TestDoubleCloudAuth(platform, api)

    // Manually set session (simulate restoreSession)
    ;(auth as any)._session = storedSession
    ;(auth as any)._networkStatus = { isOnline: false }

    assert('[5] Offline: hasValidSession = true (not stale)', auth.hasValidSession === true)
    assert('[5] Offline: isSessionStale = false (fresh session)', auth.isSessionStale === false)
    assert('[5] Offline: session.email = cached email', auth.session?.email === 'offline@example.com')
  }

  // ── Test 6: Stale session (offline > 24h) → SESSION_EXPIRED ───────────
  {
    const secure = createMockSecureStorage()
    const net = createMockNetworkStatus({ isOnline: false })

    const staleTime = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString() // 25h ago
    const staleSession: StoredSession = {
      userId: 'u-stale-1',
      employeeId: '',
      shopId: '',
      deviceId: '',
      email: 'stale@example.com',
      accessToken: 'stale-access',
      refreshToken: 'stale-refresh',
      createdAt: staleTime,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      lastValidatedAt: staleTime,
    }

    const platform = createMockPlatformAdapter(secure, net)
    const api = createMockApiClient()
    const auth = new TestDoubleCloudAuth(platform, api)
    ;(auth as any)._session = staleSession
    ;(auth as any)._networkStatus = { isOnline: false }

    assert('[6] Stale offline session: hasValidSession = false', auth.hasValidSession === false)
    assert('[6] Stale offline session: isSessionStale = true', auth.isSessionStale === true)
  }

  // ── Test 7: Sign out → SIGNED_OUT event ────────────────────────────────
  {
    const secure = createMockSecureStorage()
    const net = createMockNetworkStatus({ isOnline: true })
    const platform = createMockPlatformAdapter(secure, net)
    const api = createMockApiClient()
    const auth = new TestDoubleCloudAuth(platform, api)

    let signedOut: boolean = false
    auth.on((e) => { if (e.type === 'SIGNED_OUT') signedOut = true })

    // Set a session manually
    ;(auth as any)._session = { userId: 'u-signout', employeeId: '', shopId: '', deviceId: '', email: 'out@example.com', accessToken: 'x', refreshToken: 'y', createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 86400000).toISOString(), lastValidatedAt: new Date().toISOString() }

    await auth.signOut()
    assert('[7] signOut clears session', auth.session === null)
    assert('[7] SIGNED_OUT event fired', Boolean(signedOut))
    assert('[7] hasValidSession = false after logout', auth.hasValidSession === false)
  }

  // ── Test 8: Auth event system — unsubscribe works ───────────────────────
  {
    const secure = createMockSecureStorage()
    const net = createMockNetworkStatus({ isOnline: true })
    const platform = createMockPlatformAdapter(secure, net)
    const api = createMockApiClient()
    const auth = new TestDoubleCloudAuth(platform, api)

    let callCount = 0
    const unsub = auth.on(() => { callCount++ })

    // Manually emit a test event
    ;(auth as any).emit({ type: 'SIGNED_OUT' })
    assert('[8] Event listener called once before unsubscribe', callCount === 1)

    unsub()
    ;(auth as any).emit({ type: 'SIGNED_OUT' })
    assert('[8] Event listener NOT called after unsubscribe', callCount === 1)
  }

  // ── Test 9: SecureStorage adapter contract — set/get/delete ─────────────
  {
    const secure = createMockSecureStorage()
    const storage = secure.storage

    await storage.set('key1', 'value1')
    const retrieved = await storage.get('key1')
    assert('[9] SecureStorage set/get round-trip', retrieved === 'value1')

    await storage.delete('key1')
    const deleted = await storage.get('key1')
    assert('[9] SecureStorage delete removes key', deleted === null)
  }

  // ── Test 10: Platform adapter randomString produces expected length ──────
  {
    const secure = createMockSecureStorage()
    const net = createMockNetworkStatus()
    const platform = createMockPlatformAdapter(secure, net)

    const str16 = platform.randomString(16)
    assert('[10] randomString(16) has 32 hex chars (16 bytes → 32 hex)', str16.length === 32)

    const str64 = platform.randomString(64)
    assert('[10] randomString(64) has 128 hex chars', str64.length === 128)
  }

  // ── Test 11: NETWORK_OFFLINE returned when network is down ────────────────
  {
    const secure = createMockSecureStorage()
    const net = createMockNetworkStatus({ isOnline: false })
    const platform = createMockPlatformAdapter(secure, net)
    const api = createMockApiClient()
    const auth = new TestDoubleCloudAuth(platform, api)

    const result = await auth.signInWithEmail('test@example.com', 'pw')
    assert('[11] Offline: signInWithEmail returns ok:false', result.ok === false)
    assert('[11] Offline error code = NETWORK_OFFLINE',
      result.ok === false && (result as any).error.code === 'NETWORK_OFFLINE')
  }

  // ── Test 12: Trusted device registration ──────────────────────────────────
  {
    const secure = createMockSecureStorage()
    const net = createMockNetworkStatus({ isOnline: true })
    const platform = createMockPlatformAdapter(secure, net)
    const api = createMockApiClient()

    const deviceResult: { device: TrustedDevice; deviceToken: string } = {
      device: {
        deviceId: 'dev-123' as any,
        deviceName: 'My Phone',
        registeredAt: new Date().toISOString(),
        lastUsedAt: new Date().toISOString(),
        isAutoApproved: true,
      },
      deviceToken: 'device-secret-token',
    }
    ;(api as any).registerTrustedDevice = async () => ({ data: deviceResult, error: undefined })

    // Set up a session first
    const auth = new TestDoubleCloudAuth(platform, api)
    ;(auth as any)._session = { userId: 'u-trust', employeeId: '', shopId: '', deviceId: '', email: 'trust@example.com', accessToken: 'x', refreshToken: 'y', createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 86400000).toISOString(), lastValidatedAt: new Date().toISOString() }

    let deviceEvent: AuthEvent | null = null
    auth.on((e) => { if (e.type === 'DEVICE_REGISTERED') deviceEvent = e })

    const result = await auth.registerTrustedDevice('My Phone')
    assert('[12] registerTrustedDevice returns ok:true', result.ok === true)
    assert('[12] DEVICE_REGISTERED event fired', deviceEvent !== null)
    assert('[12] DEVICE_REGISTERED event type correct', (deviceEvent as AuthEvent | null)?.type === 'DEVICE_REGISTERED')
    assert('[12] Device token stored in secure storage',
      secure.store.has('trusted_device:dev-123'))
    assert('[12] Stored token matches returned token',
      secure.store.get('trusted_device:dev-123') === 'device-secret-token')
  }

  // ── Test 13: Error code mapping ──────────────────────────────────────────
  {
    const secure = createMockSecureStorage()
    const net = createMockNetworkStatus({ isOnline: true })
    const platform = createMockPlatformAdapter(secure, net)
    const api = createMockApiClient()
    ;(api as any).signInEmail = async () => ({
      data: undefined,
      error: { code: 'INVALID_CREDENTIALS', message: 'Bad email or password' },
    })

    const auth = new TestDoubleCloudAuth(platform, api)
    const result = await auth.signInWithEmail('bad@example.com', 'wrong')
    assert('[13] Invalid credentials returns ok:false', result.ok === false)
    assert('[13] Error code = INVALID_CREDENTIALS',
      result.ok === false && (result as any).error.code === 'INVALID_CREDENTIALS')
    assert('[13] Error message is preserved',
      result.ok === false && (result as any).error.message === 'Bad email or password')
  }

  // ── Test 14: Refresh session → SESSION_REFRESHED event ─────────────────
  {
    const secure = createMockSecureStorage()
    const net = createMockNetworkStatus({ isOnline: true })
    const platform = createMockPlatformAdapter(secure, net)
    const api = createMockApiClient()

    const refreshResult = {
      session: {} as any,
      accessToken: 'new-access-token',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }
    ;(api as any).refreshSession = async () => ({ data: refreshResult, error: undefined })

    const auth = new TestDoubleCloudAuth(platform, api)
    ;(auth as any)._session = { userId: 'u-refresh', employeeId: '', shopId: '', deviceId: '', email: 'refresh@example.com', accessToken: 'old-access', refreshToken: 'refresh-token', createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 86400000).toISOString(), lastValidatedAt: new Date().toISOString() }

    let refreshedEvent: AuthEvent | null = null
    auth.on((e) => { if (e.type === 'SESSION_REFRESHED') refreshedEvent = e })

    const result = await auth.refreshSession()
    assert('[14] refreshSession returns ok:true', result.ok === true)
    assert('[14] SESSION_REFRESHED event fired', refreshedEvent !== null)
    assert('[14] SESSION_REFRESHED event type correct', (refreshedEvent as AuthEvent | null)?.type === 'SESSION_REFRESHED')
  }

  // ── Test 15: SecureStorage backed by expo-secure-store (interface check) ─
  {
    // Verify the contract: SecureStorage.get returns string|null|Promise
    const secure = createMockSecureStorage()
    const result = secure.storage.get('any-key')
    // Must be a Promise (async method)
    assert('[15] SecureStorage.get is async (returns Promise)', result instanceof Promise)
  }

  console.log(`\nTotal: ${passed} passed, ${failed} failed`)
  process.exit(failed === 0 ? 0 : 1)
}

run().catch((err: unknown) => {
  console.error('test runner failed:', err)
  process.exit(2)
})
