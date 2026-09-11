// auth-cloud-flow.ts — Cloud authentication: Google sign-in, cloud token exchange
// Phase 18: carries enrollmentState through SDK auth path
import { cacheSession } from '../services/cloud-auth-employee'
import { db } from '../lib/instant-client'
import { AUTH_TIMEOUT_MS, withTimeout, type AuthErrorCode, type AuthResult } from './auth-types'
import { buildCloudApi } from './auth-device-enrollment'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CloudAuthClass = (require('@soostori/auth') as any).CloudAuth
  ?? (require('@soostori/auth/dist/cloud-auth') as any).CloudAuth
if (!CloudAuthClass) throw new Error('@soostori/auth CloudAuth not found')

const CloudAuth = CloudAuthClass as {
  new(platform: unknown, api: unknown): {
    signInWithGoogleIdToken(opts: { idToken: string; clientName: string }): Promise<AuthResult<{
      userId: string; email: string; displayName?: string; idToken: string
      accessToken: string; refreshToken?: string; isNewUser: boolean
    }>>
    signOut(): Promise<void>
  }>
}

function buildAuthApiClient() {
  return {
    exchangeGoogleCode: async () => ({ error: { code: 'UNSUPPORTED' as AuthErrorCode, message: '' } }),
    linkGoogleAccount: async () => ({ error: { code: 'UNSUPPORTED' as AuthErrorCode, message: '' } }),
    signInWithIdToken: async (_: string, idToken: string) => {
      const { cloudExchangeGoogleToken } = await import('../services/cloud-auth-backend')
      try {
        const result = await cloudExchangeGoogleToken(idToken)
        if (!result.ok) return { error: { code: 'AUTH_FAILED' as AuthErrorCode, message: result.code } }
        return { data: { userId: result.response.user.id, email: result.response.user.email, displayName: result.response.user.email.split('@')[0], idToken, accessToken: result.response.user.id, refreshToken: '', isNewUser: false,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          enrollmentState: (result as any).enrollmentState ?? 'existing_device' } }
      } catch (e: unknown) { return { error: { code: 'AUTH_FAILED' as AuthErrorCode, message: e instanceof Error ? e.message : String(e) } } }
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
    verifyPinForEnrollment: async (employeeId: string, pinHash: string) => {
      const { getDb } = await import('../lib/db')
      const rows = await (await getDb()).getAllAsync<{ pin_hash: string }>(`SELECT pin_hash FROM employees WHERE id = ?`, [employeeId])
      if (!rows.length) return { error: { code: 'INVALID_CREDENTIALS' as AuthErrorCode, message: 'Employee not found' } }
      if (String(rows[0].pin_hash) !== pinHash) return { error: { code: 'INVALID_CREDENTIALS' as AuthErrorCode, message: 'Incorrect PIN' } }
      return { data: { enrollmentToken: `enroll_${Date.now()}`, expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString() } }
    },
  }
}

export function createCloudAuth(platformAdapter: unknown) { return new CloudAuth(platformAdapter, buildAuthApiClient()) }

export async function signInWithGoogle(cloudAuth: InstanceType<typeof CloudAuth>, idToken: string): Promise<{ ok: boolean; result?: AuthResult<{ userId: string; email: string; enrollmentState: string; shopId: string; cloudDeviceId: string; deviceId: string }>}> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let authResult: any
  try {
    authResult = await withTimeout(cloudAuth.signInWithGoogleIdToken({ idToken, clientName: 'soostori-mobile' }), AUTH_TIMEOUT_MS, 'NETWORK_ERROR', 'Could not reach the server. Check your internet and try again.')
  } catch (e: unknown) {
    const err = e as { code?: AuthErrorCode; message?: string }
    return { ok: false, result: { ok: false, error: { code: 'NETWORK_ERROR' as AuthErrorCode, message: err.message ?? 'Network error' } } }
  }
  if (!authResult.ok) return { ok: false, result: { ok: false, error: { code: 'AUTH_FAILED', message: authResult.error?.message ?? 'Auth failed' } } }

  const { userId, email } = authResult.data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const enrollmentStateFromCloud = (authResult.data as any)?.enrollmentState as string | undefined

  const employeesResult = await db.queryOnce({ employees: {} })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cloudEmployees = (employeesResult.data.employees as any[]) || []
  const existing = cloudEmployees.find((e) => (e as { email?: string }).email === email)
  if (!existing) return { ok: false, result: { ok: false, error: { code: 'PERSON_NOT_FOUND' as AuthErrorCode, message: 'No Soostori membership for this account' } } }

  const shopsResult = await db.queryOnce({ shops: {} })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cloudShops = (shopsResult.data.shops as any[]) || []
  const shop = cloudShops.find((s) => (s as { id?: string }).id === (existing as { shopId?: string }).shopId)
  if (!shop) return { ok: false, result: { ok: false, error: { code: 'PERSON_NOT_FOUND' as AuthErrorCode, message: 'Business record missing' } } }

  const shopId = shop.id as string
  await cacheSession(shopId, existing.id, (existing.role as string) ?? 'attendant')
  const cloudApi = buildCloudApi(shopId)
  const deviceId = ''
  const devicesResult = await db.queryOnce({ devices: {} })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cloudDevices = (devicesResult.data.devices as any[]) || []
  const myDevice = cloudDevices.find((d) => (d as { deviceId?: string }).deviceId === deviceId)
  let cloudDeviceId = myDevice ? (myDevice.id as string) : ''
  if (!myDevice) {
    try {
      const enrolled = await withTimeout(cloudApi.createDeviceEnrollment(shopId, deviceId, 'Mobile Device') as Promise<{ deviceId: string }>, AUTH_TIMEOUT_MS, 'NETWORK_ERROR', 'Could not reach the server.')
      cloudDeviceId = enrolled.deviceId
    } catch { return { ok: false, result: { ok: false, error: { code: 'ENROLLMENT_FAILED' as AuthErrorCode, message: 'Could not enroll device. Contact admin.' } } }
  }
  return { ok: true, result: { ok: true, data: { userId, email, enrollmentState: enrollmentStateFromCloud === 'new_device' ? 'new_device' : 'existing_device', shopId, cloudDeviceId, deviceId } } }
}
