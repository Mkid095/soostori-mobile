// auth-types.ts — Shared types for all auth sub-modules
// Phase 18: explicit enrollment error codes per ANPAS

export type AuthErrorCode =
  | 'INVALID_CREDENTIALS' | 'EMAIL_NOT_VERIFIED' | 'EMAIL_ALREADY_EXISTS'
  | 'USER_NOT_FOUND' | 'WEAK_PASSWORD' | 'VERIFICATION_EXPIRED' | 'VERIFICATION_INVALID'
  | 'RESET_EXPIRED' | 'RESET_INVALID' | 'DEVICE_NOT_TRUSTED' | 'SESSION_REVOKED'
  | 'NETWORK_OFFLINE' | 'RATE_LIMITED' | 'OAUTH_ERROR' | 'ENROLLMENT_REQUIRED'
  | 'PIN_VERIFICATION_FAILED' | 'PIN_NOT_SET' | 'PERSON_NOT_FOUND' | 'UNKNOWN'
  | 'NETWORK_ERROR' | 'ENROLLMENT_FAILED' | 'PIN_SETUP_FAILED'

export interface AuthError {
  code: AuthErrorCode
  message: string
  retryAfterMs?: number
}

export type AuthResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: AuthError }

export type DeviceEnrollmentState =
  | 'DEVICE_NOT_ENROLLED'
  | 'PIN_SETUP_REQUIRED'
  | 'PIN_VERIFICATION_REQUIRED'
  | 'OPERATIONAL'

export interface OperationalSession {
  employeeId: string
  shopId: string
  deviceId: string
  startedAt: string
  expiresAt: string
}

export const AUTH_TIMEOUT_MS = 30_000

export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  code: AuthErrorCode,
  message: string,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject({ code, message }), ms)
    promise.then(resolve).catch(reject).finally(() => clearTimeout(timer))
  })
}
