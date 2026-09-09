// cloud-auth-backend.ts — InstantDB API calls for authentication
import AsyncStorage from '@react-native-async-storage/async-storage'
import { db, id } from '../lib/instant-client'
import type { CloudAuthResponse, SubscriptionEntitlement } from '../contracts/cloud'
import { cacheEntitlement } from './entitlement-cache'
import { resolveOrCreateEmployee } from './cloud-auth-employee'
import { resolveOrRegisterDevice } from './cloud-auth-device'

export async function cloudSendMagicCode(email: string): Promise<void> {
  await db.auth.sendMagicCode({ email })
}

export async function cloudVerifyMagicCode(email: string, code: string): Promise<CloudAuthResponse> {
  const result = await db.auth.signInWithMagicCode({ email, code })
  if (!result.user) throw new Error('Authentication failed')

  const userId = result.user.id
  await AsyncStorage.setItem('@soostori:cloudToken', userId)

  const shopsResult = await db.queryOnce({ shops: {} })
  let shop = (shopsResult.data.shops as any[])?.[0] || null

  if (!shop) {
    const shopId = id()
    await db.transact(db.tx.shops[shopId].create({
      id: shopId, name: 'My Shop', slug: `shop-${Date.now()}`,
      taxRate: 0, plan: 'free', subscriptionExpiry: '', status: 'active',
    }))
    shop = { id: shopId, name: 'My Shop', slug: `shop-${Date.now()}`, status: 'active' }
  }

  const shopId = shop.id
  await resolveOrRegisterDevice(shopId)
  // Employee must set their own PIN via OperationalAuth — do NOT create with a default
  const employee = await resolveOrCreateEmployee(shopId, email)
  const entitlement = await resolveSubscription(shopId)

  return {
    user: { id: userId, email, type: employee.role },
    shop: { id: shop.id, name: shop.name, slug: shop.slug, plan: shop.plan, status: shop.status },
    entitlement,
    serverTime: new Date().toISOString(),
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

export async function cloudExchangeGoogleToken(idToken: string): Promise<CloudAuthResponse> {
  // Exchange Google ID token for a cloud session via InstantDB auth
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await (db.auth as any).signInWithGoogle({ idToken })
  if (!result.user) throw new Error('Google authentication failed')

  const userId = result.user.id
  const email = result.user.email ?? ''
  await AsyncStorage.setItem('@soostori:cloudToken', userId)

  const shopsResult = await db.queryOnce({ shops: {} })
  let shop = (shopsResult.data.shops as any[])?.[0] || null

  if (!shop) {
    const shopId = id()
    await db.transact(db.tx.shops[shopId].create({
      id: shopId, name: 'My Shop', slug: `shop-${Date.now()}`,
      taxRate: 0, plan: 'free', subscriptionExpiry: '', status: 'active',
    }))
    shop = { id: shopId, name: 'My Shop', slug: `shop-${Date.now()}`, status: 'active' }
  }

  const shopId = shop.id
  await resolveOrRegisterDevice(shopId)
  const employee = await resolveOrCreateEmployee(shopId, email)
  const entitlement = await resolveSubscription(shopId)

  return {
    user: { id: userId, email, type: employee.role },
    shop: { id: shop.id, name: shop.name, slug: shop.slug, plan: shop.plan, status: shop.status },
    entitlement,
    serverTime: new Date().toISOString(),
  }
}

export async function cloudGetServerTime(): Promise<string> {
  return new Date().toISOString()
}
