// useAuthSdk.ts — CloudAuth + OperationalAuth wrapper for React Native
// Full auth flow: cloud auth (Google) → operational enrollment → local PIN verification
// Phase 18: refactored into auth-cloud-flow, auth-pin-flow, auth-device-enrollment
import { useState, useEffect, useCallback, useRef } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SecureStore from 'expo-secure-store'
import { cacheEntitlement } from '../services/entitlement-cache'
import { rnPlatformAdapter, rnOperationalPlatformAdapter } from '../services/sdk-adapter'
import { type AuthSdkState, type AuthResult, type AuthErrorCode, type DeviceEnrollmentState, type OperationalSession } from './auth-types'
import { createCloudAuth, signInWithGoogle as cloudSignIn } from './auth-cloud-flow'
import { setupPin, verifyPin, getLocalHasPin } from './auth-pin-flow'
import { determineEnrollmentState } from './auth-device-enrollment'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const OperationalAuthClass = (require('@soostori/auth') as any).OperationalAuth
  ?? (require('@soostori/auth/dist/operational-auth') as any).OperationalAuth
if (!OperationalAuthClass) throw new Error('@soostori/auth OperationalAuth not found')

const OperationalAuth = OperationalAuthClass as {
  new(platform: unknown): {
    deserializeSession(raw: string): OperationalSession | null
    serializeSession(s: OperationalSession): string
    verifyPin(opts: unknown): Promise<AuthResult<OperationalSession>>
    hasPinEnrolled(): Promise<boolean>
    clearPin(): Promise<void>
    get failedAttemptCount(): number; get isLocked(): boolean; get lockedUntilMs(): number | null
  }
}

export interface AuthSdkState {
  isCloudAuthenticated: boolean; cloudUser: { id: string; email: string } | null
  shopId: string | null; enrollmentState: DeviceEnrollmentState | null
  isOperational: boolean; operationalSession: OperationalSession | null
  isLoading: boolean; error: string | null; enrollmentError?: AuthErrorCode
}

export function useAuthSdk() {
  const cloudAuthRef = useRef<ReturnType<typeof createCloudAuth> | null>(null)
  const opAuthRef = useRef<InstanceType<typeof OperationalAuth> | null>(null)
  const deviceIdRef = useRef<string | null>(null)

  const [state, setState] = useState<AuthSdkState>({
    isCloudAuthenticated: false, cloudUser: null, shopId: null,
    enrollmentState: null, isOperational: false, operationalSession: null, isLoading: true, error: null,
  })

  useEffect(() => {
    ;(async () => {
      let devId = await AsyncStorage.getItem('@soostori:deviceId')
      if (!devId) { devId = `mob_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; await AsyncStorage.setItem('@soostori:deviceId', devId) }
      deviceIdRef.current = devId
      cloudAuthRef.current = createCloudAuth(rnPlatformAdapter)
      opAuthRef.current = new OperationalAuth(rnOperationalPlatformAdapter)
      const storedSession = await SecureStore.getItemAsync('@soostori:opSession')
      if (storedSession && opAuthRef.current) {
        const session = opAuthRef.current.deserializeSession(storedSession)
        if (session) { setState({ isOperational: true, operationalSession: session, isLoading: false, isCloudAuthenticated: false, cloudUser: null, shopId: null, enrollmentState: null, error: null }); return }
      }
      setState((s) => ({ ...s, isLoading: false }))
    })()
  }, [])

  const signInWithGoogle = useCallback(async (idToken: string) => {
    if (!cloudAuthRef.current) throw new Error('Auth not initialized')
    setState((s) => ({ ...s, isLoading: true, error: null, enrollmentError: undefined }))
    const { ok, result } = await cloudSignIn(cloudAuthRef.current, idToken)
    if (!ok || !result?.ok) {
      const err = result?.error ?? { code: 'AUTH_FAILED' as AuthErrorCode, message: 'Unknown error' }
      setState((s) => ({ ...s, isLoading: false, error: err.message })); return { ok: false, error: err } as AuthResult<never>
    }
    const { userId, email, shopId, cloudDeviceId } = result.data
    await AsyncStorage.setItem('@soostori:cloudToken', userId); await AsyncStorage.setItem('@soostori:shopId', shopId)
    const deviceId = deviceIdRef.current || ''
    const { enrollmentState, enrollmentError } = await determineEnrollmentState(shopId, deviceId, cloudDeviceId === '')
    setState((s) => ({ ...s, isCloudAuthenticated: true, cloudUser: { id: userId, email }, shopId, enrollmentState, enrollmentError, isLoading: false }))
    return { ok: true, data: result.data } as AuthResult<typeof result.data>
  }, [])

  const setupPinFn = useCallback(async (pin: string) => {
    if (!opAuthRef.current || !state.shopId || !deviceIdRef.current || !state.cloudUser) return { ok: false, error: { code: 'UNKNOWN' as AuthErrorCode, message: 'Auth not ready' } } as AuthResult<never>
    const result = await setupPin(opAuthRef.current, pin, state.cloudUser.id, state.shopId, deviceIdRef.current)
    setState((s) => ({ ...s, enrollmentState: result.ok ? 'OPERATIONAL' : s.enrollmentState, isOperational: result.ok, enrollmentError: result.ok ? undefined : 'PIN_SETUP_FAILED' }))
    return result
  }, [state.shopId, state.cloudUser])

  const verifyPinFn = useCallback(async (pin: string) => {
    if (!opAuthRef.current || !state.shopId || !deviceIdRef.current || !state.cloudUser) return { ok: false, error: { code: 'UNKNOWN' as AuthErrorCode, message: 'Auth not ready' } } as AuthResult<never>
    const result = await verifyPin(opAuthRef.current, pin, state.cloudUser.id, state.shopId, deviceIdRef.current)
    setState((s) => ({ ...s, enrollmentState: result.ok ? 'OPERATIONAL' : s.enrollmentState, isOperational: result.ok, operationalSession: result.ok ? result.data ?? null : s.operationalSession, enrollmentError: result.ok ? undefined : result.error?.code }))
    return result
  }, [state.shopId, state.cloudUser])

  const hasPinEnrolled = useCallback(async (): Promise<boolean> => getLocalHasPin(), [])

  const signOut = useCallback(async () => {
    await SecureStore.deleteItemAsync('@soostori:opSession')
    await SecureStore.deleteItemAsync('@soostori:hasPin')
    await SecureStore.deleteItemAsync('@soostori:pinSalt')
    await SecureStore.deleteItemAsync('@soostori:pinVerifier')
    await AsyncStorage.multiRemove(['@soostori:cloudToken', '@soostori:shopId', '@soostori:employeeId', '@soostori:employeeRole'])
    await cacheEntitlement({ shopId: 'default', status: 'expired', plan: 'free', expiresAt: new Date(0).toISOString(), verifiedAt: new Date(0).toISOString(), serverTime: new Date(0).toISOString(), nextVerificationDeadline: new Date(0).toISOString() }, new Date(0).toISOString())
    setState({ isCloudAuthenticated: false, cloudUser: null, shopId: null, enrollmentState: null, isOperational: false, operationalSession: null, isLoading: false, error: null })
  }, [])

  return { ...state, signInWithGoogle, setupPin: setupPinFn, verifyPin: verifyPinFn, hasPinEnrolled, signOut }
}
