// subscription-enforcer.ts — Phase 19: subscription enforcement for sync timer
// Blocks sync when subscription is cancelled/blocked; warns during grace period.
import { getCachedEntitlement } from './entitlement-cache'
import { revalidateSubscription } from './subscription-guard'
import { getCurrentShopId } from './session-helper'

const log = {
  warn: (msg: string, ...args: unknown[]) => console.warn(`[SubEnforcer] ${msg}`, ...args),
}

export class SubscriptionBlockedError extends Error {
  constructor() {
    super('Subscription blocked — sync suspended')
    this.name = 'SubscriptionBlockedError'
  }
}

export type SubscriptionSyncStatus =
  | 'active'
  | 'expired_grace'
  | 'blocked'
  | 'cancelled'

export interface SubscriptionSyncState {
  status: SubscriptionSyncStatus
  expiresAt: string | null
}

/**
 * checkSubscriptionForSync — checks cached entitlement first, revalidates if stale.
 * Returns the current subscription status relevant for sync operations.
 */
export async function checkSubscriptionForSync(): Promise<SubscriptionSyncState> {
  const cached = await getCachedEntitlement()
  const now = new Date()

  if (cached) {
    const expiresAt = cached.expiresAt ? new Date(cached.expiresAt) : null
    if (expiresAt && now > expiresAt) {
      // Cached entitlement expired
      const shopId = await getCurrentShopId()
      if (shopId) {
        const ok = await revalidateSubscription(shopId)
        if (!ok) {
          return { status: 'expired_grace', expiresAt: cached.expiresAt }
        }
        return { status: 'active', expiresAt: cached.expiresAt }
      }
      return { status: 'expired_grace', expiresAt: cached.expiresAt }
    }
    if (cached.status === 'cancelled' || cached.status === 'blocked') {
      return { status: cached.status as SubscriptionSyncStatus, expiresAt: cached.expiresAt }
    }
    if (cached.status === 'active' || cached.status === 'past_due') {
      return { status: 'active', expiresAt: cached.expiresAt }
    }
  }

  // No cached entitlement — try revalidation
  const shopId = await getCurrentShopId()
  if (shopId) {
    const ok = await revalidateSubscription(shopId)
    return ok
      ? { status: 'active', expiresAt: null }
      : { status: 'expired_grace', expiresAt: null }
  }

  return { status: 'expired_grace', expiresAt: null }
}

/**
 * enforceSubscriptionForSync — called at the start of pullAndApply.
 * Throws SubscriptionBlockedError if subscription is blocked/cancelled.
 * Warns if in grace period.
 */
export async function enforceSubscriptionForSync(): Promise<void> {
  const state = await checkSubscriptionForSync()

  if (state.status === 'blocked' || state.status === 'cancelled') {
    log.warn('Subscription status:', state.status)
    // Pause sync engine so no cloud events are applied
    try {
      const { pauseSync } = await import('./mobile-sync-service')
      await pauseSync()
    } catch {
      // ignore if not available
    }
    throw new SubscriptionBlockedError()
  }

  if (state.status === 'expired_grace') {
    log.warn('Operating during subscription grace period')
  }
}
