// auth-device-enrollment.ts — Device enrollment state detection
// Determines WAITING_FOR_TOKEN → TOKEN_RECEIVED → PIN_SETUP flow
// Phase 18: explicit error codes (NETWORK_ERROR, ENROLLMENT_FAILED, PIN_SETUP_FAILED)
import { getLocalHasPin } from '../services/cloud-auth-device'
import { db, id } from '../lib/instant-client'
import { AUTH_TIMEOUT_MS, withTimeout, type AuthErrorCode, type DeviceEnrollmentState } from './auth-types'

export { type DeviceEnrollmentState } from './auth-types'

// ─── Cloud API for OperationalAuth enrollment calls ──────────────────────────

function buildCloudApi(shopId: string) {
  return {
    getDeviceStatus: async (_shopId: string, _deviceId: string) => ({
      exists: !!(await db.queryOnce({ devices: {} })).data.devices?.find(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (d: any) => d.shopId === _shopId,
      ),
      hasPin: await getLocalHasPin(),
    }),

    createDeviceEnrollment: async (shopId: string, deviceId: string, deviceName: string) => {
      const devId = id()
      await db.transact(
        db.tx.devices[devId].create({
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
        }),
      )
      return { deviceId: devId, hasPin: false }
    },

    verifyPinForEnrollment: async (employeeId: string, pinHash: string) => {
      const { getDb } = await import('../lib/db')
      const localDb = await getDb()
      const rows = await localDb.getAllAsync<{ pin_hash: string }>(
        `SELECT pin_hash FROM employees WHERE id = ?`,
        [employeeId],
      )
      if (!rows.length) return { error: { code: 'INVALID_CREDENTIALS' as AuthErrorCode, message: 'Employee not found' } }
      if (String(rows[0].pin_hash) !== pinHash) {
        return { error: { code: 'INVALID_CREDENTIALS' as AuthErrorCode, message: 'Incorrect PIN' } }
      }
      return { data: { enrollmentToken: `enroll_${Date.now()}`, expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString() } }
    },
  }
}

// ─── Public: determine enrollment state after cloud auth ─────────────────────

export async function determineEnrollmentState(
  shopId: string,
  deviceId: string,
  isNewDeviceFromCloud: boolean,
): Promise<{ enrollmentState: DeviceEnrollmentState; enrollmentError?: AuthErrorCode }> {
  const cloudApi = buildCloudApi(shopId)
  const hasPin = await getLocalHasPin()

  if (isNewDeviceFromCloud) {
    try {
      await withTimeout(
        cloudApi.createDeviceEnrollment(shopId, deviceId, 'Mobile Device') as Promise<unknown>,
        AUTH_TIMEOUT_MS,
        'NETWORK_ERROR',
        'Could not reach the server. Check your internet and try again.',
      )
    } catch (e: unknown) {
      const err = e as { code?: AuthErrorCode }
      return { enrollmentState: 'DEVICE_NOT_ENROLLED', enrollmentError: err.code ?? 'ENROLLMENT_FAILED' }
    }
    return { enrollmentState: hasPin ? 'PIN_VERIFICATION_REQUIRED' : 'PIN_SETUP_REQUIRED' }
  }

  return { enrollmentState: hasPin ? 'PIN_VERIFICATION_REQUIRED' : 'PIN_SETUP_REQUIRED' }
}
