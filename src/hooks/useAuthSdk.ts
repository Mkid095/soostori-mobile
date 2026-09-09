// useAuthSdk.ts — CloudAuth + OperationalAuth wrapper for React Native
// Full auth flow: cloud auth (Google) → operational enrollment → local PIN verification
import { useState, useEffect, useCallback, useRef } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SecureStore from 'expo-secure-store'
import { cacheSession } from '../services/cloud-auth-employee'
import { cacheEntitlement } from '../services/entitlement-cache'
import { db, id } from '../lib/instant-client'
import { rnPlatformAdapter, rnOperationalPlatformAdapter } from '../services/sdk-adapter'

// ─── Minimal SDK type inlines (avoids exports-map TS resolution issue) ─────────

type AuthErrorCode =
  | 'INVALID_CREDENTIALS' | 'EMAIL_NOT_VERIFIED' | 'EMAIL_ALREADY_EXISTS'
  | 'USER_NOT_FOUND' | 'WEAK_PASSWORD' | 'VERIFICATION_EXPIRED' | 'VERIFICATION_INVALID'
  | 'RESET_EXPIRED' | 'RESET_INVALID' | 'DEVICE_NOT_TRUSTED' | 'SESSION_REVOKED'
  | 'NETWORK_OFFLINE' | 'RATE_LIMITED' | 'OAUTH_ERROR' | 'ENROLLMENT_REQUIRED'
  | 'PIN_VERIFICATION_FAILED' | 'PIN_NOT_SET' | 'UNKNOWN'

interface AuthError { code: AuthErrorCode; message: string; retryAfterMs?: number }

type AuthResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: AuthError }

type DeviceEnrollmentState =
  | 'DEVICE_NOT_ENROLLED'
  | 'PIN_SETUP_REQUIRED'
  | 'PIN_VERIFICATION_REQUIRED'
  | 'OPERATIONAL'

interface OperationalSession {
  employeeId: string
  shopId: string
  deviceId: string
  startedAt: string
  expiresAt: string
}

// ─── SDK class types — resolved via require() to bypass exports-map ─────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CloudAuthClass = (require('@soostori/auth') as any).CloudAuth ?? (require('@soostori/auth/dist/cloud-auth') as any).CloudAuth
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const OperationalAuthClass = (require('@soostori/auth') as any).OperationalAuth ?? (require('@soostori/auth/dist/operational-auth') as any).OperationalAuth

if (!CloudAuthClass) throw new Error('@soostori/auth CloudAuth not found — check package installation')
if (!OperationalAuthClass) throw new Error('@soostori/auth OperationalAuth not found — check package installation')

const CloudAuth = CloudAuthClass as {
  new(platform: unknown, api: unknown): {
    signInWithGoogleIdToken(opts: { idToken: string; clientName: string }): Promise<AuthResult<{
      userId: string; email: string; displayName?: string; idToken: string
      accessToken: string; refreshToken?: string; isNewUser: boolean
    }>>
    restoreSession(): Promise<unknown>
    signOut(): Promise<void>
  }
}

const OperationalAuth = OperationalAuthClass as {
  new(platform: unknown): {
    getEnrollmentState(opts: {
      cloudApi?: {
        getDeviceStatus(shopId: string, deviceId: string): Promise<{ exists: boolean; hasPin: boolean }>
      }
      shopId: string
      deviceId: string
    }): Promise<DeviceEnrollmentState>
    beginEnrollment(opts: {
      cloudApi: unknown
      state: DeviceEnrollmentState
      shopId: string
      deviceId: string
      deviceName: string
      employeeId?: string
      pinVerificationHash?: string
    }): Promise<AuthResult<{ nextState: DeviceEnrollmentState } | { needsCloudVerify: true; employeeId: string }>>
    completeEnrollmentWithCloudVerify(opts: {
      cloudApi: unknown
      employeeId: string
      shopId: string
      deviceId: string
      newPin: string
      newPinHash: string
      newPinSalt: string
    }): Promise<AuthResult<void>>
    setupPin(opts: {
      pin: string
      hashPin: (pin: string, salt?: string) => Promise<{ hash: string; salt: string }>
      employeeId: string
      shopId: string
      deviceId: string
    }): Promise<AuthResult<{ salt: string; verifierHash: string }>>
    verifyPin(opts: {
      pin: string
      verifyPin: (pin: string, hashHex: string, saltHex: string) => boolean
      employeeId: string
      shopId: string
      deviceId: string
      sessionTtlMs?: number
    }): Promise<AuthResult<OperationalSession>>
    hasPinEnrolled(): Promise<boolean>
    changePin(opts: unknown): Promise<AuthResult<unknown>>
    clearPin(): Promise<void>
    get failedAttemptCount(): number
    get isLocked(): boolean
    get lockedUntilMs(): number | null
    deserializeSession(raw: string): OperationalSession | null
    serializeSession(session: OperationalSession): string
  }
}

// ─── PBKDF2 crypto (react-native-quick-crypto) ────────────────────────────────

const ITERATIONS = 100_000
const KEY_BYTES = 32

async function pbkdf2Hash(pin: string, saltHex?: string): Promise<{ hash: string; salt: string }> {
  const { pbkdf2Sync, randomBytes } = require('react-native-quick-crypto') as {
    pbkdf2Sync: (pin: string, salt: Buffer | Uint8Array, iter: number, keyLen: number, digest: string) => Buffer
    randomBytes: (n: number) => Uint8Array
  }
  const salt = saltHex ? Buffer.from(saltHex, 'hex') : randomBytes(32)
  const saltHexOut = salt.toString('hex')
  const derived = pbkdf2Sync(pin, salt, ITERATIONS, KEY_BYTES, 'sha256')
  return { hash: derived.toString('hex'), salt: saltHexOut }
}

function pbkdf2Verify(pin: string, hashHex: string, saltHex: string): boolean {
  const { pbkdf2Sync } = require('react-native-quick-crypto') as {
    pbkdf2Sync: (pin: string, salt: Buffer | Uint8Array, iter: number, keyLen: number, digest: string) => Buffer
  }
  const salt = Buffer.from(saltHex, 'hex')
  const derived = pbkdf2Sync(pin, salt, ITERATIONS, KEY_BYTES, 'sha256')
  return derived.toString('hex') === hashHex
}

// ─── Cloud API for OperationalAuth ──────────────────────────────────────────

function buildCloudApi(shopId: string) {
  return {
    getDeviceStatus: async (_shopId: string, _deviceId: string) => {
      const result = await db.queryOnce({ devices: {} })
      const devices = (result.data.devices as any[]) || []
      const myDevice = devices.find((d: any) => d.shopId === _shopId)
      return {
        exists: !!myDevice,
        hasPin: myDevice?.hasPin ?? false,
      }
    },
    createDeviceEnrollment: async (shopId: string, deviceId: string, deviceName: string) => {
      const devId = id()
      await db.transact(db.tx.devices[devId].create({
        id: devId,
        shopId,
        deviceId,
        deviceName,
        deviceType: 'mobile',
        status: 'authorized',
        lastSeenAt: new Date().toISOString(),
        authorizedAt: new Date().toISOString(),
        isLanHost: false,
        isPrimary: false,
        hasPin: false,
        pinSetupAt: '',
      }))
      return { deviceId: devId, hasPin: false }
    },
    verifyPinForEnrollment: async (employeeId: string, pinHash: string) => {
      const { getDb } = await import('../lib/db')
      const localDb = await getDb()
      const rows = await localDb.getAllAsync<Record<string, unknown>>(
        `SELECT pin_hash FROM employees WHERE id = ?`,
        [employeeId]
      )
      if (!rows.length) return { error: { code: 'INVALID_CREDENTIALS' as AuthErrorCode, message: 'Employee not found' } }
      if (String(rows[0].pin_hash) !== pinHash) {
        return { error: { code: 'INVALID_CREDENTIALS' as AuthErrorCode, message: 'Incorrect PIN' } }
      }
      return {
        data: {
          enrollmentToken: `enroll_${Date.now()}`,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        },
      }
    },
    setDeviceHasPin: async (_shopId: string, _deviceId: string, _hasPin: true) => {
      // push-schema blocker: hasPin cannot be added to FIDScript schema via transact
      // Local state tracked via SecureStore instead
    },
  }
}

// ─── AuthApiClient for CloudAuth ──────────────────────────────────────────────

function buildAuthApiClient() {
  return {
    exchangeGoogleCode: async () => ({ error: { code: 'UNSUPPORTED' as AuthErrorCode, message: 'Use signInWithGoogleIdToken' } }),
    linkGoogleAccount: async () => ({ error: { code: 'UNSUPPORTED' as AuthErrorCode, message: 'Not implemented' } }),
    signInWithIdToken: async (clientName: string, idToken: string) => {
      const { cloudExchangeGoogleToken } = await import('../services/cloud-auth-backend')
      try {
        const result = await cloudExchangeGoogleToken(idToken)
        return {
          data: {
            userId: result.user.id,
            email: result.user.email,
            displayName: result.user.email.split('@')[0],
            idToken,
            accessToken: result.user.id,
            refreshToken: '',
            isNewUser: false,
          },
        }
      } catch (e: any) {
        return { error: { code: 'AUTH_FAILED' as AuthErrorCode, message: e.message } }
      }
    },
    registerEmail: async () => ({ error: { code: 'UNSUPPORTED' as AuthErrorCode, message: 'Email registration not supported' } }),
    verifyEmail: async () => ({ error: { code: 'UNSUPPORTED' as AuthErrorCode, message: 'Not implemented' } }),
    requestPasswordReset: async () => ({ error: { code: 'UNSUPPORTED' as AuthErrorCode, message: 'Not implemented' } }),
    completePasswordReset: async () => ({ error: { code: 'UNSUPPORTED' as AuthErrorCode, message: 'Not implemented' } }),
    signInEmail: async () => ({ error: { code: 'UNSUPPORTED' as AuthErrorCode, message: 'Use Google Sign-In' } }),
    refreshSession: async () => ({ error: { code: 'UNSUPPORTED' as AuthErrorCode, message: 'Not implemented' } }),
    revokeSession: async () => ({ error: { code: 'UNSUPPORTED' as AuthErrorCode, message: 'Not implemented' } }),
    registerTrustedDevice: async () => ({ error: { code: 'UNSUPPORTED' as AuthErrorCode, message: 'Not implemented' } }),
    listTrustedDevices: async () => ({ error: { code: 'UNSUPPORTED' as AuthErrorCode, message: 'Not implemented' } }),
    removeTrustedDevice: async () => ({ error: { code: 'UNSUPPORTED' as AuthErrorCode, message: 'Not implemented' } }),
    verifyPinForEnrollment: async (employeeId: string, pinHash: string) => {
      const { getDb } = await import('../lib/db')
      const localDb = await getDb()
      const rows = await localDb.getAllAsync<Record<string, unknown>>(
        `SELECT pin_hash FROM employees WHERE id = ?`,
        [employeeId]
      )
      if (!rows.length) return { error: { code: 'INVALID_CREDENTIALS' as AuthErrorCode, message: 'Employee not found' } }
      if (String(rows[0].pin_hash) !== pinHash) {
        return { error: { code: 'INVALID_CREDENTIALS' as AuthErrorCode, message: 'Incorrect PIN' } }
      }
      return {
        data: {
          enrollmentToken: `enroll_${Date.now()}`,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        },
      }
    },
  }
}

// ─── Hook state & instance refs ────────────────────────────────────────────────

export interface AuthSdkState {
  isCloudAuthenticated: boolean
  cloudUser: { id: string; email: string } | null
  shopId: string | null
  enrollmentState: DeviceEnrollmentState | null
  isOperational: boolean
  operationalSession: OperationalSession | null
  isLoading: boolean
  error: string | null
}

const SESSION_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuthSdk() {
  const cloudAuthRef = useRef<InstanceType<typeof CloudAuth> | null>(null)
  const opAuthRef = useRef<InstanceType<typeof OperationalAuth> | null>(null)
  const deviceIdRef = useRef<string | null>(null)

  const [state, setState] = useState<AuthSdkState>({
    isCloudAuthenticated: false,
    cloudUser: null,
    shopId: null,
    enrollmentState: null,
    isOperational: false,
    operationalSession: null,
    isLoading: true,
    error: null,
  })

  // Initialize SDK instances and try to restore sessions
  useEffect(() => {
    ;(async () => {
      // Get or create device ID
      let devId = await AsyncStorage.getItem('@soostori:deviceId')
      if (!devId) {
        devId = `mob_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
        await AsyncStorage.setItem('@soostori:deviceId', devId)
      }
      deviceIdRef.current = devId

      // Init CloudAuth
      cloudAuthRef.current = new CloudAuth(rnPlatformAdapter, buildAuthApiClient())

      // Init OperationalAuth
      opAuthRef.current = new OperationalAuth(rnOperationalPlatformAdapter)

      // Try to restore operational session from secure storage
      const storedSession = await SecureStore.getItemAsync('@soostori:opSession')
      if (storedSession && opAuthRef.current) {
        const session = opAuthRef.current.deserializeSession(storedSession)
        if (session) {
          setState(s => ({
            ...s,
            isOperational: true,
            operationalSession: session,
            isLoading: false,
          }))
          return
        }
      }

      setState(s => ({ ...s, isLoading: false }))
    })()
  }, [])

  // Sign in with Google (mobile native flow)
  const signInWithGoogle = useCallback(async (idToken: string) => {
    if (!cloudAuthRef.current) throw new Error('Auth not initialized')
    setState(s => ({ ...s, isLoading: true, error: null }))

    const result = await cloudAuthRef.current.signInWithGoogleIdToken({
      idToken,
      clientName: 'soostori-mobile',
    })

    if (!result.ok) {
      setState(s => ({ ...s, isLoading: false, error: result.error?.message }))
      return result
    }

    const userId = result.data.userId
    const email = result.data.email
    await AsyncStorage.setItem('@soostori:cloudToken', userId)

    // Get or create shop
    const shopsResult = await db.queryOnce({ shops: {} })
    let shop = (shopsResult.data.shops as any[])?.[0]
    if (!shop) {
      const shopId = id()
      await db.transact(db.tx.shops[shopId].create({
        id: shopId,
        name: 'My Shop',
        slug: `shop-${Date.now()}`,
        taxRate: 0,
        plan: 'free',
        subscriptionExpiry: '',
        status: 'active',
      }))
      shop = { id: shopId, name: 'My Shop', slug: `shop-${Date.now()}`, status: 'active', plan: 'free' }
    }

    const shopId = shop.id
    const deviceId = deviceIdRef.current || ''

    // Cache session to AsyncStorage
    await cacheSession(shopId, userId, 'owner')
    await AsyncStorage.setItem('@soostori:shopId', shopId)

    // Register or find device in cloud
    const cloudApi = buildCloudApi(shopId)
    let cloudDeviceId = ''
    const devicesResult = await db.queryOnce({ devices: {} })
    const cloudDevices = (devicesResult.data.devices as any[]) || []
    const myDevice = cloudDevices.find((d: any) => d.deviceId === deviceId)
    if (!myDevice) {
      const enrolled = await cloudApi.createDeviceEnrollment(shopId, deviceId, 'Mobile Device')
      cloudDeviceId = enrolled.deviceId
    } else {
      cloudDeviceId = myDevice.id
    }

    // Determine enrollment state
    let enrollmentState: DeviceEnrollmentState = 'DEVICE_NOT_ENROLLED'
    if (myDevice) {
      enrollmentState = myDevice.hasPin ? 'PIN_VERIFICATION_REQUIRED' : 'PIN_SETUP_REQUIRED'
    }

    setState(s => ({
      ...s,
      isCloudAuthenticated: true,
      cloudUser: { id: userId, email },
      shopId,
      enrollmentState,
      isLoading: false,
    }))

    return result
  }, [])

  // Begin enrollment (new device)
  const beginEnrollment = useCallback(async () => {
    if (!opAuthRef.current || !state.shopId || !deviceIdRef.current) {
      return { ok: false, error: { code: 'UNKNOWN' as AuthErrorCode, message: 'Auth not ready' } } as AuthResult<never>
    }

    const deviceId = deviceIdRef.current
    const cloudApi = buildCloudApi(state.shopId)

    const result = await opAuthRef.current.beginEnrollment({
      cloudApi,
      state: state.enrollmentState ?? 'DEVICE_NOT_ENROLLED',
      shopId: state.shopId,
      deviceId,
      deviceName: 'Mobile Device',
      employeeId: state.cloudUser?.id,
    })

    return result
  }, [state.shopId, state.enrollmentState, state.cloudUser])

  // Setup a new PIN locally
  const setupPin = useCallback(async (pin: string) => {
    if (!opAuthRef.current || !state.shopId || !deviceIdRef.current || !state.cloudUser) {
      return { ok: false, error: { code: 'UNKNOWN' as AuthErrorCode, message: 'Auth not ready' } } as AuthResult<never>
    }

    const deviceId = deviceIdRef.current

    const result = await opAuthRef.current.setupPin({
      pin,
      hashPin: pbkdf2Hash,
      employeeId: state.cloudUser.id,
      shopId: state.shopId,
      deviceId,
    })

    if (result.ok) {
      // Persist PIN enrollment locally (hasPin/pinSetupAt blocked by push-schema)
      await SecureStore.setItemAsync('@soostori:hasPin', 'true')
      await SecureStore.setItemAsync('@soostori:pinSalt', result.data.salt)
      await SecureStore.setItemAsync('@soostori:pinVerifier', result.data.verifierHash)

      // Verify PIN to establish operational session
      const verifyResult = await opAuthRef.current.verifyPin({
        pin,
        verifyPin: pbkdf2Verify,
        employeeId: state.cloudUser.id,
        shopId: state.shopId,
        deviceId,
        sessionTtlMs: SESSION_TTL_MS,
      })

      if (verifyResult.ok) {
        await SecureStore.setItemAsync('@soostori:opSession', opAuthRef.current.serializeSession(verifyResult.data))
        setState(s => ({
          ...s,
          enrollmentState: 'OPERATIONAL',
          isOperational: true,
          operationalSession: verifyResult.data,
        }))
      }
    }

    return result
  }, [state.shopId, state.cloudUser])

  // Verify PIN for operational session
  const verifyPin = useCallback(async (pin: string) => {
    if (!opAuthRef.current || !state.shopId || !deviceIdRef.current || !state.cloudUser) {
      return { ok: false, error: { code: 'UNKNOWN' as AuthErrorCode, message: 'Auth not ready' } } as AuthResult<never>
    }

    const deviceId = deviceIdRef.current

    const result = await opAuthRef.current.verifyPin({
      pin,
      verifyPin: pbkdf2Verify,
      employeeId: state.cloudUser.id,
      shopId: state.shopId,
      deviceId,
      sessionTtlMs: SESSION_TTL_MS,
    })

    if (result.ok) {
      await SecureStore.setItemAsync('@soostori:opSession', opAuthRef.current.serializeSession(result.data))
      setState(s => ({
        ...s,
        enrollmentState: 'OPERATIONAL',
        isOperational: true,
        operationalSession: result.data,
      }))
    }

    return result
  }, [state.shopId, state.cloudUser])

  // Check if device has a PIN enrolled (local secure storage check)
  const hasPinEnrolled = useCallback(async (): Promise<boolean> => {
    const val = await SecureStore.getItemAsync('@soostori:hasPin')
    return val === 'true'
  }, [])

  // Sign out — clears all sessions
  const signOut = useCallback(async () => {
    await SecureStore.deleteItemAsync('@soostori:opSession')
    await SecureStore.deleteItemAsync('@soostori:hasPin')
    await SecureStore.deleteItemAsync('@soostori:pinSalt')
    await SecureStore.deleteItemAsync('@soostori:pinVerifier')
    await AsyncStorage.multiRemove([
      '@soostori:cloudToken',
      '@soostori:shopId',
      '@soostori:employeeId',
      '@soostori:employeeRole',
    ])
    await cacheEntitlement({
      shopId: 'default', status: 'expired', plan: 'free',
      expiresAt: new Date(0).toISOString(),
      verifiedAt: new Date(0).toISOString(),
      serverTime: new Date(0).toISOString(),
      nextVerificationDeadline: new Date(0).toISOString(),
    }, new Date(0).toISOString())
    setState({
      isCloudAuthenticated: false,
      cloudUser: null,
      shopId: null,
      enrollmentState: null,
      isOperational: false,
      operationalSession: null,
      isLoading: false,
      error: null,
    })
  }, [])

  return {
    ...state,
    signInWithGoogle,
    beginEnrollment,
    setupPin,
    verifyPin,
    hasPinEnrolled,
    signOut,
  }
}
