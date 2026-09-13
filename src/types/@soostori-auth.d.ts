/**
 * Supplemental type + value declarations for @soostori/auth@0.1.0-alpha.3
 *
 * The SDK's package.json exports map only defines "." and "./pin-node".
 * The index.d.ts does not re-export cloud-auth.d.ts — this is a known SDK
 * type-declaration gap that this file fills.
 *
 * Alpha.3 introduces:
 *   - CloudAuth class (cloud authentication controller)
 *   - PlatformAuthAdapter interface (platform integration contract)
 *   - SecureStorage interface (Keychain/Keystore abstraction)
 *   - AuthApiClient interface (REST backend contract)
 *   - AuthEvent system (SIGNED_IN, SIGNED_OUT, SESSION_REFRESHED, etc.)
 *   - Google OAuth + PKCE support
 *   - email/password registration, verification, reset
 *   - Trusted device management
 *
 * Mobile does NOT use SDK PIN — Mobile has its own PBKDF2 PIN in db-employees.ts.
 */

declare module '@soostori/auth' {
  // ── cloud-auth ─────────────────────────────────────────────────────────────

  export const DEFAULT_SESSION_TTL_MS: number
  export const SESSION_STALE_THRESHOLD_MS: number
  export const TRUSTED_DEVICE_SCOPE: 'trusted_device'

  export type AuthErrorCode =
    | 'INVALID_CREDENTIALS' | 'EMAIL_NOT_VERIFIED' | 'EMAIL_ALREADY_EXISTS'
    | 'USER_NOT_FOUND' | 'WEAK_PASSWORD' | 'VERIFICATION_EXPIRED' | 'VERIFICATION_INVALID'
    | 'RESET_EXPIRED' | 'RESET_INVALID' | 'DEVICE_NOT_TRUSTED' | 'SESSION_REVOKED'
    | 'NETWORK_OFFLINE' | 'RATE_LIMITED' | 'OAUTH_ERROR' | 'UNKNOWN'

  export interface AuthError {
    code: AuthErrorCode
    message: string
    retryAfterMs?: number
  }

  export type AuthResult<T = void> =
    | { ok: true; data: T }
    | { ok: false; error: AuthError }

  export interface SecureStorage {
    get(key: string): string | null | Promise<string | null>
    set(key: string, value: string): void | Promise<void>
    delete(key: string): void | Promise<void>
  }

  export interface NetworkStatus {
    isOnline: boolean
    effectiveType?: string
  }

  export interface PlatformAuthAdapter {
    openOAuthBrowser(url: string): Promise<void>
    getSecureStorage(): SecureStorage
    getNetworkStatus(): NetworkStatus
    randomString(byteLength: number): string
    setCookie(name: string, value: string, options?: { httpOnly?: boolean; secure?: boolean; sameSite?: 'Lax' | 'Strict' | 'None'; maxAge?: number; path?: string }): void | Promise<void>
  }

  export interface GoogleOAuthConfig {
    clientId: string
    redirectUri: string
    scopes?: string[]
    codeChallengeMethod?: 'S256'
  }

  export interface GoogleSignInResult {
    userId: string
    email: string
    displayName?: string
    idToken: string
    accessToken: string
    isNewUser: boolean
  }

  export interface GoogleSignInPartial {
    state: string
    code?: string
  }

  export interface EmailRegistrationResult {
    userId: string
    email: string
    requiresEmailVerification: boolean
    verificationToken?: string
  }

  export interface EmailVerificationResult {
    userId: string
    email: string
    isEmailVerified: true
    session?: AuthSession
  }

  export interface PasswordResetRequestResult {
    email: string
    resetLinkSent: true
  }

  export interface PasswordResetCompleteResult {
    userId: string
    email: string
    accessToken: string
    refreshToken: string
  }

  export interface StoredSession {
    userId: string
    employeeId: string
    shopId: string
    deviceId: string
    email: string
    accessToken: string
    refreshToken: string
    createdAt: string
    expiresAt: string
    lastValidatedAt: string
  }

  export interface SessionRefreshResult {
    session: AuthSession
    accessToken: string
    expiresAt: string
  }

  export interface TrustedDevice {
    deviceId: string
    deviceName: string
    registeredAt: string
    lastUsedAt: string
    isAutoApproved: boolean
  }

  export interface TrustedDeviceResult {
    device: TrustedDevice
    deviceToken: string
  }

  export interface AuthApiResponse<T> {
    data?: T
    error?: { code: string; message: string; retryAfterMs?: number }
  }

  export interface SignInResult {
    userId: string
    employeeId: string
    email: string
    accessToken: string
    refreshToken: string
    expiresAt: string
    isEmailVerified: boolean
    session: AuthSession
  }

  export type AuthEvent =
    | { type: 'SIGNED_IN'; session: StoredSession }
    | { type: 'SIGNED_OUT' }
    | { type: 'SESSION_REFRESHED'; session: StoredSession }
    | { type: 'SESSION_EXPIRED' }
    | { type: 'EMAIL_VERIFIED'; userId: string; email: string }
    | { type: 'DEVICE_REGISTERED'; device: TrustedDevice }
    | { type: 'DEVICE_REVOKED'; deviceId: string }
    | { type: 'ERROR'; error: AuthError }

  export type AuthEventListener = (event: AuthEvent) => void

  export interface AuthApiClient {
    exchangeGoogleCode(code: string, codeVerifier: string, redirectUri: string): Promise<AuthApiResponse<GoogleSignInResult>>
    linkGoogleAccount(idToken: string, sessionAccessToken: string): Promise<AuthApiResponse<GoogleSignInResult>>
    registerEmail(email: string, password: string, employeeName: string): Promise<AuthApiResponse<EmailRegistrationResult>>
    verifyEmail(token: string): Promise<AuthApiResponse<EmailVerificationResult>>
    requestPasswordReset(email: string): Promise<AuthApiResponse<PasswordResetRequestResult>>
    completePasswordReset(token: string, newPassword: string): Promise<AuthApiResponse<PasswordResetCompleteResult>>
    signInEmail(email: string, password: string): Promise<AuthApiResponse<SignInResult>>
    refreshSession(refreshToken: string): Promise<AuthApiResponse<SessionRefreshResult>>
    revokeSession(accessToken: string): Promise<AuthApiResponse<void>>
    registerTrustedDevice(deviceToken: string, deviceName: string, accessToken: string): Promise<AuthApiResponse<TrustedDeviceResult>>
    listTrustedDevices(accessToken: string): Promise<AuthApiResponse<TrustedDevice[]>>
    removeTrustedDevice(deviceId: string, accessToken: string): Promise<AuthApiResponse<void>>
  }

  export class CloudAuth {
    constructor(platform: PlatformAuthAdapter, api: AuthApiClient)
    on(listener: AuthEventListener): () => void
    readonly session: StoredSession | null
    readonly isSessionStale: boolean
    readonly hasValidSession: boolean
    signInWithGoogle(config: GoogleOAuthConfig): Promise<AuthResult<GoogleSignInResult>>
    handleOAuthCallback(partial: GoogleSignInPartial, codeVerifier: string, redirectUri: string): Promise<AuthResult<GoogleSignInResult>>
    signInWithEmail(email: string, password: string): Promise<AuthResult<SignInResult>>
    registerWithEmail(email: string, password: string, employeeName: string, sendVerificationEmail?: boolean): Promise<AuthResult<EmailRegistrationResult>>
    verifyEmailAddress(token: string): Promise<AuthResult<EmailVerificationResult>>
    resetPassword(email: string): Promise<AuthResult<PasswordResetRequestResult>>
    completePasswordReset(token: string, newPassword: string): Promise<AuthResult<PasswordResetCompleteResult>>
    refreshSession(): Promise<AuthResult<SessionRefreshResult>>
    restoreSession(): Promise<StoredSession | null>
    signOut(): Promise<void>
    registerTrustedDevice(deviceName: string): Promise<AuthResult<TrustedDeviceResult>>
    listTrustedDevices(): Promise<AuthResult<TrustedDevice[]>>
    removeTrustedDevice(deviceId: string): Promise<AuthResult<void>>
    // ── protected — override in subclass for platform storage ──────────────────
    protected _saveStoredSession(session: StoredSession): Promise<void>
    protected _loadStoredSession(): Promise<StoredSession | null>
    protected _clearStoredSession(): Promise<void>
  }

  // ── session (index re-exports these) ────────────────────────────────────────

  export function loadSession(storage: SessionStorage, key?: string): Promise<unknown>
  export function saveSession(storage: SessionStorage, session: unknown, key?: string): Promise<void>
  export function clearSession(storage: SessionStorage, key?: string): Promise<void>
  export function serializeSession(session: unknown): string

  // ── SessionStorage interface ────────────────────────────────────────────────

  export interface SessionStorage {
    get(key: string): string | null | Promise<string | null>
    set(key: string, value: string): void | Promise<void>
    delete(key: string): void | Promise<void>
  }

  // ── permissions (index re-exports these) ────────────────────────────────────

  export function hasPermission(role: unknown, permission: string): boolean
  export function checkPermission(
    role: unknown,
    permission: string,
    overrides?: Record<string, boolean> | null,
  ): boolean
}
