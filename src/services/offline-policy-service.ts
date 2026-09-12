// offline-policy-service.ts — Phase 19: wires @soostori/offline into mobile sync engine
// Enforces 3-day offline state machine and surfaces OFFLINE_WARNING / OFFLINE_LIMIT_EXCEEDED to UI.
import AsyncStorage from '@react-native-async-storage/async-storage'
import { computeOfflineState, type OfflineState, type PolicyInputs } from '@soostori/offline'
import { getCurrentShopId } from './session-helper'
import { getCachedEntitlement } from './entitlement-cache'
import { getSyncStatus } from './mobile-sync-service'

const log = {
  warn: (msg: string, ...args: unknown[]) => console.warn(`[OfflinePolicy] ${msg}`, ...args),
}

const LAST_ONLINE_KEY = '@soostori:lastOnlineAt'

export type OfflinePhase = OfflineState['phase']

export interface OfflinePolicyResult {
  phase: OfflinePhase
  daysOffline: number
  remainingDays: number
}

/**
 * OfflinePolicyService — evaluates the 3-day offline policy from @soostori/offline.
 * Call checkPolicy() at the start of each sync cycle.
 */
export class OfflinePolicyService {
  /**
   * loadLastOnlineAt — reads the last timestamp when device confirmed online.
   */
  async loadLastOnlineAt(): Promise<string | null> {
    return AsyncStorage.getItem(LAST_ONLINE_KEY)
  }

  /**
   * recordOnline — call whenever a sync cycle succeeds (pushOutbox or pull).
   */
  async recordOnline(): Promise<void> {
    await AsyncStorage.setItem(LAST_ONLINE_KEY, new Date().toISOString())
  }

  /**
   * checkPolicy — evaluates the offline state machine.
   * When phase is OFFLINE_LIMIT_EXCEEDED, pauses sync and triggers blocked auth state.
   */
  async checkPolicy(): Promise<OfflinePolicyResult> {
    const lastOnline = await this.loadLastOnlineAt()
    const lastVerifiedAt = lastOnline ?? new Date().toISOString()
    const shopId = await getCurrentShopId()
    const entitlement = await getCachedEntitlement()
    const syncStatus = await getSyncStatus()

    const inputs: PolicyInputs = {
      shopId: shopId ?? 'shop-default',
      isOnline: syncStatus.isOnline,
      lastVerifiedAt,
      entitlement: entitlement ?? null,
      offlineSince: lastOnline ? lastVerifiedAt : null,
      subscriptionExpired: false,
      primaryLost: false,
      now: new Date(),
    }

    const state = computeOfflineState(inputs)

    // When limit exceeded, pause sync — UI will read blocked state from auth
    if (state.phase === 'OFFLINE_LIMIT_EXCEEDED') {
      log.warn('Offline limit exceeded — pausing sync')
      try {
        const { pauseSync } = await import('./mobile-sync-service')
        await pauseSync()
      } catch {
        // ignore if not available
      }
    }

    return {
      phase: state.phase,
      daysOffline: state.daysSinceVerification,
      remainingDays: state.daysUntilLimit,
    }
  }
}

export const offlinePolicyService = new OfflinePolicyService()

/**
 * checkAndRecordOnline — call at end of successful sync cycle.
 * Updates lastOnlineAt so offline tracking is accurate.
 */
export async function checkAndRecordOnline(): Promise<void> {
  await offlinePolicyService.recordOnline()
}
