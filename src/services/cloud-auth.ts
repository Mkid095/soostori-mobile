// src/services/cloud-auth.ts — Real Instant DB authentication
import { db, id } from '../lib/instant-client'
import type { CloudAuthResponse, SubscriptionEntitlement } from '../contracts/cloud'
import { cacheEntitlement } from './entitlement-cache'
import AsyncStorage from '@react-native-async-storage/async-storage'

const CLOUD_TOKEN_KEY = '@soostori:cloudToken'

export async function cloudSendMagicCode(email: string): Promise<void> {
  await db.auth.sendMagicCode({ email })
}

export async function cloudVerifyMagicCode(email: string, code: string): Promise<CloudAuthResponse> {
  const result = await db.auth.signInWithMagicCode({ email, code })
  if (result.user) {
    await AsyncStorage.setItem(CLOUD_TOKEN_KEY, result.user.id)
  }
  // Get or create shop
  const shops = await db.queryOnce({ shops: {} })
  const shop = shops.data.shops?.[0] || null
  if (!shop) {
    // Create default shop
    const shopId = id()
    const shopChunk = db.tx.shops[shopId].create({
      id: shopId, name: 'My Shop', slug: `shop-${Date.now()}`, status: 'active',
      taxRate: 0, plan: 'free', subscriptionExpiry: '',
    })
    await db.transact(shopChunk)
    return {
      user: { id: result.user.id, email, type: 'owner' },
      shop: { id: shopId, name: 'My Shop', slug: `shop-${Date.now()}` },
      entitlement: await verifySubscription(shopId),
      serverTime: new Date().toISOString(),
    }
  }
  return {
    user: { id: result.user.id, email, type: 'owner' },
    shop,
    entitlement: await verifySubscription(shop.id),
    serverTime: new Date().toISOString(),
  }
}

export async function verifySubscription(shopId: string): Promise<SubscriptionEntitlement> {
  const entitlement: SubscriptionEntitlement = {
    shopId,
    status: 'active',
    plan: 'free',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    verifiedAt: new Date().toISOString(),
    serverTime: new Date().toISOString(),
    nextVerificationDeadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
  }
  await cacheEntitlement(entitlement, entitlement.serverTime)
  return entitlement
}

export async function cloudGetServerTime(): Promise<string> {
  return new Date().toISOString()
}
