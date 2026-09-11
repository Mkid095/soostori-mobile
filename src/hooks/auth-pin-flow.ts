// auth-pin-flow.ts — PIN setup and verify flows with 30s network timeout
// Phase 18: explicit PIN_SETUP_FAILED error code
import * as SecureStore from 'expo-secure-store'
import { AUTH_TIMEOUT_MS, withTimeout, type AuthErrorCode, type AuthResult, type OperationalSession } from './auth-types'
import { getLocalHasPin, setLocalHasPin } from '../services/cloud-auth-device'

const SESSION_TTL_MS = 24 * 60 * 60 * 1000

// ─── PBKDF2 crypto ────────────────────────────────────────────────────────────

const ITERATIONS = 100_000
const KEY_BYTES = 32

async function pbkdf2Hash(pin: string, saltHex?: string): Promise<{ hash: string; salt: string }> {
  const { pbkdf2Sync, randomBytes } = require('react-native-quick-crypto') as {
    pbkdf2Sync: (pin: string, salt: Buffer | Uint8Array, iter: number, keyLen: number, digest: string) => Buffer
    randomBytes: (n: number) => Uint8Array
  }
  const salt = saltHex ? Buffer.from(saltHex, 'hex') : randomBytes(32)
  const derived = pbkdf2Sync(pin, salt, ITERATIONS, KEY_BYTES, 'sha256')
  return { hash: derived.toString('hex'), salt: salt.toString('hex') }
}

function pbkdf2Verify(pin: string, hashHex: string, saltHex: string): boolean {
  const { pbkdf2Sync } = require('react-native-quick-crypto') as {
    pbkdf2Sync: (pin: string, salt: Buffer | Uint8Array, iter: number, keyLen: number, digest: string) => Buffer
  }
  const salt = Buffer.from(saltHex, 'hex')
  const derived = pbkdf2Sync(pin, salt, ITERATIONS, KEY_BYTES, 'sha256')
  return derived.toString('hex') === hashHex
}

// ─── Setup new PIN ───────────────────────────────────────────────────────────

export async function setupPin(
  opAuth: {
    setupPin(opts: { pin: string; hashPin: (p: string, s?: string) => Promise<{ hash: string; salt: string }>; employeeId: string; shopId: string; deviceId: string }): Promise<AuthResult<{ salt: string; verifierHash: string }>>
    verifyPin(opts: { pin: string; verifyPin: (p: string, h: string, s: string) => boolean; employeeId: string; shopId: string; deviceId: string; sessionTtlMs?: number }): Promise<AuthResult<OperationalSession>>
    serializeSession(s: OperationalSession): string
  },
  pin: string,
  employeeId: string,
  shopId: string,
  deviceId: string,
): Promise<AuthResult<{ salt: string; verifierHash: string }>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let result: any
  try {
    result = await withTimeout(
      opAuth.setupPin({ pin, hashPin: pbkdf2Hash, employeeId, shopId, deviceId }),
      AUTH_TIMEOUT_MS, 'NETWORK_ERROR', 'PIN setup timed out. Check your internet and try again.',
    )
  } catch {
    return { ok: false, error: { code: 'PIN_SETUP_FAILED' as AuthErrorCode, message: 'PIN setup timed out. Try again.' } }
  }

  if (!result.ok) return result as AuthResult<{ salt: string; verifierHash: string }>

  await setLocalHasPin(true)
  await SecureStore.setItemAsync('@soostori:pinSalt', result.salt)
  await SecureStore.setItemAsync('@soostori:pinVerifier', result.verifierHash)

  const verifyResult = await opAuth.verifyPin({ pin, verifyPin: pbkdf2Verify, employeeId, shopId, deviceId, sessionTtlMs: SESSION_TTL_MS })
  if (verifyResult.ok) {
    await SecureStore.setItemAsync('@soostori:opSession', opAuth.serializeSession(verifyResult.data))
  }
  return result as AuthResult<{ salt: string; verifierHash: string }>
}

// ─── Verify existing PIN ─────────────────────────────────────────────────────

export async function verifyPin(
  opAuth: {
    verifyPin(opts: { pin: string; verifyPin: (p: string, h: string, s: string) => boolean; employeeId: string; shopId: string; deviceId: string; sessionTtlMs?: number }): Promise<AuthResult<OperationalSession>>
    serializeSession(s: OperationalSession): string
  },
  pin: string,
  employeeId: string,
  shopId: string,
  deviceId: string,
): Promise<AuthResult<OperationalSession>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let result: any
  try {
    result = await withTimeout(
      opAuth.verifyPin({ pin, verifyPin: pbkdf2Verify, employeeId, shopId, deviceId, sessionTtlMs: SESSION_TTL_MS }),
      AUTH_TIMEOUT_MS, 'NETWORK_ERROR', 'Could not reach the server.',
    )
  } catch {
    return { ok: false, error: { code: 'NETWORK_ERROR' as AuthErrorCode, message: 'Check your internet and try again.' } }
  }
  if (!result.ok) return result as AuthResult<OperationalSession>
  await SecureStore.setItemAsync('@soostori:opSession', opAuth.serializeSession(result.data))
  return result as AuthResult<OperationalSession>
}

export { getLocalHasPin }
