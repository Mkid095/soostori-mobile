// @soostori/subscription — runtime mock for jest (CJS).
// Minimal stub: always allow.

export interface SubscriptionState {
  status: string
  isPosEnabled: boolean
  isInventoryEnabled: boolean
  isReportsEnabled: boolean
  planName: string
  trialDaysLeft: number
  graceDaysLeft: number
}

export interface CachedEntitlement {
  planName: string
  isPosEnabled: boolean
  isInventoryEnabled: boolean
}

export function enforceSubscription(
  _entitlement: CachedEntitlement,
  _shopId: string,
): Promise<void> {
  return Promise.resolve()
}

export function computeState(_entitlement: CachedEntitlement): SubscriptionState {
  return {
    status: 'active',
    isPosEnabled: true,
    isInventoryEnabled: true,
    isReportsEnabled: true,
    planName: 'Pro',
    trialDaysLeft: 0,
    graceDaysLeft: 2,
  }
}
