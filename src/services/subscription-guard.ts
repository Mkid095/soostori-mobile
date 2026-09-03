// Subscription enforcement — Phase 11
// Reads cached entitlement, falls back to cloud revalidation when stale.

import { getCachedEntitlement } from './entitlement-cache'
import { resolveSubscription } from './cloud-auth'

export type SubscriptionStatus = 'active' | 'past_due' | 'expired' | 'unknown'

export async function getCurrentSubscription(): Promise<SubscriptionStatus> {
  const ent = await getCachedEntitlement()
  if (!ent) return 'unknown'
  if (new Date() > new Date(ent.expiresAt)) {
    if (ent.status === 'active' || ent.status === 'past_due') {
      // Cached entitlement is past its expiry date
      return 'expired'
    }
    return ent.status as SubscriptionStatus
  }
  return ent.status as SubscriptionStatus
}

export async function isOperational(): Promise<boolean> {
  const status = await getCurrentSubscription()
  return status === 'active' || status === 'past_due'
}

export async function revalidateSubscription(shopId: string): Promise<boolean> {
  try {
    const ent = await resolveSubscription(shopId)
    return ent.status === 'active' || ent.status === 'past_due'
  } catch {
    return false
  }
}

export async function needsRevalidation(): Promise<boolean> {
  const ent = await getCachedEntitlement()
  if (!ent) return true
  const next = new Date(ent.nextVerificationDeadline)
  return new Date() > next
}
