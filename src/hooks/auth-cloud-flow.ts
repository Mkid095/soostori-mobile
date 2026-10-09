// auth-cloud-flow.ts — Cloud authentication: magic code via InstantDB
//
// Magic code auth uses InstantDB directly (db.auth.signInWithMagicCode).
// AuthApiClient stubs out all Google-specific methods since Google Sign-In
// has been removed from the app.
import type { AuthErrorCode } from './auth-types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CloudAuthClass = (require('@soostori/auth') as any).CloudAuth
  ?? (require('@soostori/auth/dist/cloud-auth') as any).CloudAuth
if (!CloudAuthClass) throw new Error('@soostori/auth CloudAuth not found')

// ─── AuthApiClient — bridges custom InstantDB auth to the SDK ──────────────────

/**
 * AuthApiClient implementation — all Google methods return UNSUPPORTED.
 * Mobile uses magic code auth via InstantDB directly (cloudVerifyMagicCode).
 * This bridge only exists to satisfy the SDK's CloudAuth constructor contract.
 */
function buildAuthApiClient() {
  return {
    exchangeGoogleCode: async () => ({ error: { code: 'UNSUPPORTED' as AuthErrorCode, message: 'Google Sign-In has been removed' } }),
    linkGoogleAccount: async () => ({ error: { code: 'UNSUPPORTED' as AuthErrorCode, message: 'Google Sign-In has been removed' } }),
    signInWithIdToken: async () => ({ error: { code: 'UNSUPPORTED' as AuthErrorCode, message: 'Google Sign-In has been removed' } }),

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
