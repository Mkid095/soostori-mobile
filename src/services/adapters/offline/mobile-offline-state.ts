/**
 * Mobile offline state — canonical adapter.
 *
 * Phase 11.3f (Mobile Commerce). Single canonical offline-state machine
 * via @soostori/offline.computeOfflineState. The 3-day window + 7-day
 * subscription-grace rule is preserved.
 */

import { OFFLINE_GRACE_DAYS, type ShopId } from '@soostori/core'
import {
  computeOfflineState,
  type OfflineState as SdkOfflineState,
} from '@soostori/offline'

export type MobileOfflineState = SdkOfflineState

export function computeMobileOfflineState(inputs: {
  shopId: ShopId
  isOnline: boolean
  lastVerifiedAt: string
  entitlement: Parameters<typeof computeOfflineState>[0]['entitlement']
  primaryLost?: boolean
  subscriptionExpired?: boolean
  offlineSince?: string | null
  now?: Date
}): MobileOfflineState {
  return computeOfflineState({
    shopId: inputs.shopId,
    isOnline: inputs.isOnline,
    lastVerifiedAt: inputs.lastVerifiedAt,
    entitlement: inputs.entitlement,
    primaryLost: inputs.primaryLost ?? false,
    subscriptionExpired: inputs.subscriptionExpired ?? false,
    offlineSince: inputs.offlineSince ?? null,
    now: inputs.now,
  })
}

export const MOBILE_OFFLINE_GRACE_DAYS = OFFLINE_GRACE_DAYS
