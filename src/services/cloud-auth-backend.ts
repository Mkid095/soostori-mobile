// cloud-auth-backend.ts — InstantDB API calls for authentication
//
// §17/§84: Auth does NOT provision a business. A user who authenticates with
// Google / magic code but has no existing Soostori membership (no employee row
// for their email) receives a typed PERSON_NOT_FOUND result. The UI then
// surfaces the §29 contact phone (UNAUTHORIZED_LOGIN_CONTACT_PHONE) so the
// user can reach a salesperson for enrollment. No shop is ever created here.
import AsyncStorage from '@react-native-async-storage/async-storage'
import { db } from '../lib/instant-client'
import type { CloudAuthResponse, SubscriptionEntitlement } from '../contracts/cloud'
import { cacheEntitlement } from './entitlement-cache'
import { resolveOrCreateEmployee } from './cloud-auth-employee'
import { resolveOrRegisterDevice } from './cloud-auth-device'

export type CloudAuthResult =
  | { ok: true; response: CloudAuthResponse; enrollmentState: 'new_device' | 'existing_device' }
  | { ok: false; code: 'PERSON_NOT_FOUND' }

export async function cloudSendMagicCode(email: string): Promise<void> {
  await db.auth.sendMagicCode({ email })
}

export async function cloudVerifyMagicCode(email: string, code: string): Promise<CloudAuthResult> {
  const result = await db.auth.signInWithMagicCode({ email, code })
  if (!result.user) throw new Error('Authentication failed')

  const userId = result.user.id
  await AsyncStorage.setItem('@soostori:cloudToken', userId)

  const existing = await findExistingEmployee(email)
  if (!existing) {
    return { ok: false, code: 'PERSON_NOT_FOUND' }
  }

  const shop = await findShopById(existing.shopId)
  if (!shop) {
    return { ok: false, code: 'PERSON_NOT_FOUND' }
  }

  const shopId = shop.id
  await resolveOrRegisterDevice(shopId)
  const employee = await resolveOrCreateEmployee(shopId, email, existing)
  const entitlement = await resolveSubscription(shopId)

  // Phase 18: flag new_device when cloud employee record has no prior device enrollment
  const isNewDevice = !existing.cloudEmployeeId

  return {
    ok: true,
    response: {
      user: { id: userId, email, type: employee.role },
      shop: { id: shop.id, name: shop.name, slug: shop.slug, plan: shop.plan, status: shop.status },
      entitlement,
      serverTime: new Date().toISOString(),
    },
    enrollmentState: isNewDevice ? 'new_device' : 'existing_device',
  }
}

export async function resolveSubscription(shopId: string): Promise<SubscriptionEntitlement> {
  try {
    const subsResult = await db.queryOnce({ subscriptions: {} })
    const subs = (subsResult.data.subscriptions as any[]) || []
    const sub = subs.find((s: any) => s.shopId === shopId)
    if (sub) {
      const entitlement: SubscriptionEntitlement = {
        shopId, status: sub.status || 'active', plan: sub.planKey || 'free',
        expiresAt: sub.currentPeriodEnd || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        verifiedAt: new Date().toISOString(), serverTime: new Date().toISOString(),
        nextVerificationDeadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      }
      await cacheEntitlement(entitlement, entitlement.serverTime)
      return entitlement
    }
  } catch { /* not found */ }

  const entitlement: SubscriptionEntitlement = {
    shopId, status: 'active', plan: 'free',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    verifiedAt: new Date().toISOString(), serverTime: new Date().toISOString(),
    nextVerificationDeadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
  }
  await cacheEntitlement(entitlement, entitlement.serverTime)
  return entitlement
}

/**
 * Exchange a Google ID token for a cloud session via InstantDB.
 *
 * This is called by AuthApiClient.signInWithIdToken in auth-cloud-flow.ts,
 * which is itself called by CloudAuth.signInWithGoogleIdToken from the SDK.
 * The SDK maps the return value to its GoogleSignInResult type.
 */
export async function cloudExchangeGoogleToken(idToken: string): Promise<{
  userId: string
  email: string
  displayName?: string
  idToken: string
  accessToken: string
  refreshToken?: string
  isNewUser: boolean
}> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await (db.auth as any).signInWithGoogle({ idToken })
  if (!result.user) throw new Error('Google authentication failed')

  const userId = result.user.id
  const email = result.user.email ?? ''
  await AsyncStorage.setItem('@soostori:cloudToken', userId)

  return {
    userId,
    email,
    displayName: result.user.displayName ?? email.split('@')[0],
    idToken,
    accessToken: userId,
    refreshToken: '',
    isNewUser: result.isNewUser ?? false,
  }
}

export async function cloudGetServerTime(): Promise<string> {
  return new Date().toISOString()
}

// ─── internal helpers ────────────────────────────────────────────────────────

type EmployeeRow = { id: string; shopId: string; email?: string; role: string; cloudEmployeeId?: string }
type ShopRow = { id: string; name: string; slug?: string; plan?: string; status?: string }

async function findExistingEmployee(email: string): Promise<EmployeeRow | null> {
  const result = await db.queryOnce({ employees: {} })
  const employees = (result.data.employees as EmployeeRow[]) || []
  return employees.find((e) => e.email === email) ?? null
}

async function findShopById(shopId: string): Promise<ShopRow | null> {
  const result = await db.queryOnce({ shops: {} })
  const shops = (result.data.shops as ShopRow[]) || []
  return shops.find((s) => s.id === shopId) ?? null
}
