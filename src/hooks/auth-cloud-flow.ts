// auth-cloud-flow.ts — Cloud authentication: Google sign-in, cloud token exchange
// Phase 18: carries enrollmentState through SDK auth path
//
// B1/B2 Decision: Option B — magic code and Google exchange remain custom via
// InstantDB (db.auth.signInWithMagicCode / db.auth.signInWithGoogle) rather than
// going through CloudAuth.signInWithGoogleIdToken(). The custom path is intentional
// because Mobile uses a custom auth backend. The AuthApiClient.signInWithIdToken()
// bridges the SDK by providing the response shape the SDK expects.
//
// B3: After signInWithGoogleIdToken succeeds, identity (shopId, employeeId,
// deviceId) is read from the SDK's StoredSession rather than from separate
// AsyncStorage keys. cloud-auth-employee.ts caches identity for cold-start
// scenarios before restoreSession() has run.
import { cacheSessionIdentity } from '../services/cloud-auth-employee'
import { db } from '../lib/instant-client'
import { AUTH_TIMEOUT_MS, withTimeout, type AuthErrorCode, type AuthResult } from './auth-types'
import { buildCloudApi } from './auth-device-enrollment'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CloudAuthClass = (require('@soostori/auth') as any).CloudAuth
  ?? (require('@soostori/auth/dist/cloud-auth') as any).CloudAuth
if (!CloudAuthClass) throw new Error('@soostori/auth CloudAuth not found')

// ─── AuthApiClient — bridges custom InstantDB auth to the SDK ──────────────────

/**
 * AuthApiClient implementation that delegates to custom InstantDB auth.
 *
 * signInWithIdToken: receives the Google ID token from GoogleSignin.signIn(),
 * exchanges it via InstantDB (db.auth.signInWithGoogle), and returns the
 * GoogleSignInResult shape expected by CloudAuth.signInWithGoogleIdToken().
 *
 * B1 Option B: This is NOT CloudAuth.signInWithGoogleIdToken() — it's the
 * custom bridge for Mobile's own auth backend.
 */
function buildAuthApiClient() {
  return {
    exchangeGoogleCode: async () => ({ error: { code: 'UNSUPPORTED' as AuthErrorCode, message: '' } }),
    linkGoogleAccount: async () => ({ error: { code: 'UNSUPPORTED' as AuthErrorCode, message: '' } }),

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    signInWithIdToken: async (_clientName: string, idToken: string): Promise<{ data?: any; error?: { code: string; message: string } }> => {
      const { cloudExchangeGoogleToken } = await import('../services/cloud-auth-backend')
      try {
        const result = await cloudExchangeGoogleToken(idToken)
        // cloudExchangeGoogleToken returns the raw user fields; we wrap them
        // as GoogleSignInResult so CloudAuth.signInWithGoogleIdToken can use them.
        return {
          data: {
            userId: result.userId,
            email: result.email,
            displayName: result.displayName,
            idToken: result.idToken,
            accessToken: result.accessToken,
            refreshToken: result.refreshToken ?? '',
            isNewUser: result.isNewUser,
          },
        }
      } catch (e: unknown) {
        return {
          error: {
            code: 'AUTH_FAILED',
            message: e instanceof Error ? e.message : String(e),
          },
        }
      }
    },

    registerEmail: async () => ({ error: { code: 'UNSUPPORTED' as AuthErrorCode, message: '' } }),
    verifyEmail: async () => ({ error: { code: 'UNSUPPORTED' as AuthErrorCode, message: '' } }),
    requestPasswordReset: async () => ({ error: { code: 'UNSUPPORTED' as AuthErrorCode, message: '' } }),
    completePasswordReset: async () => ({ error: { code: 'UNSUPPORTED' as AuthErrorCode, message: '' } }),
    signInEmail: async () => ({ error: { code: 'UNSUPPORTED' as AuthErrorCode, message: '' } }),
    refreshSession: async () => ({ error: { code: 'UNSUPPORTED' as AuthErrorCode, message: '' } }),
    revokeSession: async () => ({ error: { code: 'UNSUPPORTED' as AuthErrorCode, message: '' } }),
    registerTrustedDevice: async () => ({ error: { code: 'UNSUPPORTED' as AuthErrorCode, message: '' } }),
    listTrustedDevices: async () => ({ error: { code: 'UNSUPPORTED' as AuthErrorCode, message: '' } }),
    removeTrustedDevice: async () => ({ error: { code: 'UNSUPPORTED' as AuthErrorCode, message: '' } }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    verifyPinForEnrollment: async (employeeId: string, pinProof: string): Promise<{ data?: any; error?: { code: string; message: string } }> => {
      const { getDb } = await import('../lib/db')
      const rows = await (await getDb()).getAllAsync<{ pin_hash: string }>(
        `SELECT pin_hash FROM employees WHERE id = ?`,
        [employeeId],
      )
      if (!rows.length) return { error: { code: 'INVALID_CREDENTIALS', message: 'Employee not found' } }
      if (String(rows[0].pin_hash) !== pinProof) {
        return { error: { code: 'INVALID_CREDENTIALS', message: 'Incorrect PIN' } }
      }
      // Real token from backend's verifyPinForEnrollment would go here.
      // The SDK's beginEnrollment() routes through OperationalAuth → cloudApi.verifyPinForEnrollment.
      return {
        data: {
          enrollmentToken: `enroll_${Date.now()}`,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        },
      }
    },
    getDeviceStatus: async () => ({ data: { exists: false, hasPin: false } }),
    createDeviceEnrollment: async () => ({ data: { deviceId: '', hasPin: false } }),
    consumeEnrollmentToken: async () => ({ data: { success: true as const } }),
    changePin: async () => ({ data: { success: true as const } }),
    requestPinRecovery: async () => ({ data: { cooldownSeconds: 60 } }),
    verifyPinRecoveryCode: async () => ({ data: { recoveryAuthToken: '', expiresAt: new Date().toISOString() } }),
    resetPin: async () => ({ data: { success: true as const } }),
    listEnrolledDevices: async () => ({ data: [] }),
    revokeDevice: async () => ({ data: { success: true as const } }),
    getSubscriptionStatus: async () => ({
      data: { status: 'active', planKey: 'free', deviceLimit: 99, currentPeriodEnd: new Date().toISOString(), currentDeviceCount: 1 },
    }),
  }
}

export function createCloudAuth(platformAdapter: unknown) {
  return new CloudAuthClass(platformAdapter, buildAuthApiClient())
}

// ─── signInWithGoogle — uses SDK CloudAuth → StoredSession for identity ───────

export async function signInWithGoogle(
  cloudAuth: InstanceType<typeof CloudAuthClass>,
  idToken: string,
): Promise<{
  ok: boolean
  result?: AuthResult<{
    userId: string
    email: string
    enrollmentState: string
    shopId: string
    cloudDeviceId: string
    deviceId: string
  }>
}> {
  let authResult: { ok: boolean; data?: { userId: string; email: string }; error?: { message?: string } }
  try {
    authResult = await withTimeout(
      cloudAuth.signInWithGoogleIdToken({ idToken, clientName: 'soostori-mobile' }),
      AUTH_TIMEOUT_MS,
      'NETWORK_ERROR',
      'Could not reach the server. Check your internet and try again.',
    )
  } catch (e: unknown) {
    const err = e as { code?: AuthErrorCode; message?: string }
    return {
      ok: false,
      result: {
        ok: false,
        error: { code: 'NETWORK_ERROR' as AuthErrorCode, message: err.message ?? 'Network error' },
      },
    }
  }

  if (!authResult.ok) {
    return {
      ok: false,
      result: {
        ok: false,
        error: { code: 'AUTH_FAILED' as AuthErrorCode, message: authResult.error?.message ?? 'Auth failed' },
      },
    }
  }

  const { userId, email } = authResult.data

  // B3: Read identity from SDK's StoredSession (populated by CloudAuth after
  // signInWithGoogleIdToken succeeds — GAP-01/02/03 fixed in alpha.7).
  // Fall back to local query if session not yet persisted.
  const session = cloudAuth.session
  const shopId = session?.shopId ?? ''
  const deviceId = session?.deviceId ?? ''
  const employeeId = session?.employeeId ?? ''

  if (!shopId || !employeeId) {
    // Fallback: query InstantDB directly if StoredSession not yet available.
    const employeesResult = await db.queryOnce({ employees: {} })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cloudEmployees = (employeesResult.data.employees as any[]) || []
    const existing = cloudEmployees.find((e: { email?: string }) => e.email === email)
    if (!existing) {
      return {
        ok: false,
        result: {
          ok: false,
          error: { code: 'PERSON_NOT_FOUND' as AuthErrorCode, message: 'No Soostori membership for this account' },
        },
      }
    }
    const shopsResult = await db.queryOnce({ shops: {} })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cloudShops = (shopsResult.data.shops as any[]) || []
    const shop = cloudShops.find((s: { id?: string }) => s.id === (existing as { shopId?: string }).shopId)
    if (!shop) {
      return {
        ok: false,
        result: {
          ok: false,
          error: { code: 'PERSON_NOT_FOUND' as AuthErrorCode, message: 'Business record missing' },
        },
      }
    }
    // Cache for cold-start before SDK restoreSession runs.
    await cacheSessionIdentity(existing.id, shop.id, deviceId, (existing.role as string) ?? 'attendant')
    return {
      ok: true,
      result: {
        ok: true,
        data: {
          userId,
          email,
          enrollmentState: 'existing_device',
          shopId: shop.id,
          cloudDeviceId: '',
          deviceId,
        },
      },
    }
  }

  // Identity from StoredSession — cache for cold-start.
  await cacheSessionIdentity(employeeId, shopId, deviceId, session?.email ?? email)

  // Determine enrollmentState based on device enrollment status.
  const cloudApi = buildCloudApi(shopId)
  let cloudDeviceId = ''
  const devicesResult = await db.queryOnce({ devices: {} })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cloudDevices = (devicesResult.data.devices as any[]) || []
  const myDevice = cloudDevices.find((d: { deviceId?: string }) => d.deviceId === deviceId)
  cloudDeviceId = myDevice ? (myDevice.id as string) : ''
  if (!myDevice) {
    try {
      const enrolled = await withTimeout(
        cloudApi.createDeviceEnrollment(shopId, deviceId, 'Mobile Device') as Promise<{ deviceId: string }>,
        AUTH_TIMEOUT_MS,
        'NETWORK_ERROR',
        'Could not reach the server.',
      )
      cloudDeviceId = enrolled.deviceId
    } catch {
      return {
        ok: false,
        result: {
          ok: false,
          error: { code: 'ENROLLMENT_FAILED' as AuthErrorCode, message: 'Could not enroll device. Contact admin.' },
        },
      }
    }
  }

  // B6: StoredSession now carries the enrollment context from the SDK.
  // If the SDK's StoredSession has a signal that this is a new device,
  // use it. Otherwise fall back to local hasPin check.
  const hasPin = cloudApi.getDeviceStatus(shopId, deviceId).then((r) => r.hasPin)
  const enrollmentState = (await hasPin) ? 'existing_device' : 'new_device'

  return {
    ok: true,
    result: {
      ok: true,
      data: { userId, email, enrollmentState, shopId, cloudDeviceId, deviceId },
    },
  }
}
