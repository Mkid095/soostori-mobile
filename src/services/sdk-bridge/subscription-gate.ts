// src/services/sdk-bridge/subscription-gate.ts
//
// Mobile subscription gate. Wraps @soostori/subscription.enforceSubscription
// to throw a typed error when the cached entitlement forbids POS operations.

import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  enforceSubscription,
  computeState,
  type SubscriptionState,
  type CachedEntitlement,
} from '@soostori/subscription'
import type { SubscriptionEntitlement } from '@soostori/core'
import { getCachedEntitlement } from '../entitlement-cache'
import { SoostoriError } from '@soostori/core'

const LAST_VERIFIED_KEY = '@soostori:lastVerifiedAt'

export class SubscriptionBlockedError extends SoostoriError {
  constructor(message: string) {
    super('SUBSCRIPTION_BLOCKED', message)
  }
}

export async function enforceSubscriptionOrThrow(): Promise<void> {
  const { state } = await loadCachedSubscriptionState()
  try {
    enforceSubscription(state)
  } catch (e) {
    throw new SubscriptionBlockedError((e as Error).message)
  }
}

export async function loadCachedSubscriptionState(): Promise<{
  state: SubscriptionState
  cached: SubscriptionEntitlement | null
}> {
  const [cached, lastVerified] = await Promise.all([
    getCachedEntitlement(),
    AsyncStorage.getItem(LAST_VERIFIED_KEY),
  ])
  // Adapt local entitlement (string shopId) to SDK CachedEntitlement (branded ShopId).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sdkCached = cached ? { entitlement: cached as any, lastVerifiedAt: lastVerified ?? cached.verifiedAt } as CachedEntitlement : null
  // cached is local (unbranded); cast to branded type at the boundary.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { state: computeState(sdkCached), cached: cached as any }
}

export async function readSubscriptionState(): Promise<{
  state: SubscriptionState
  cached: SubscriptionEntitlement | null
}> {
  return loadCachedSubscriptionState()
}
