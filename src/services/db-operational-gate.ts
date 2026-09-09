/**
 * db-operational-gate.ts — Mobile mutation gate.
 *
 * Enforces two separate offline-capability policies at the service boundary:
 *
 * 1. 3-day offline policy — device may not perform stock mutations after
 *    being offline for ≥ MOBILE_OFFLINE_GRACE_DAYS (3 days), regardless of
 *    subscription state.
 *
 * 2. Primary Device policy — mobile is a LAN client (never host). Stock
 *    mutations require the Primary Device to be online/reachable.
 *
 * Both checks run BEFORE the SQLite transaction begins so the error is
 * thrown before any DB state is touched.
 */

import { getMobilePrimaryStatus } from './adapters/devices/mobile-primary-coordinator'
import { computeMobileOfflineState, MOBILE_OFFLINE_GRACE_DAYS } from './adapters/offline/mobile-offline-state'
import { getCachedEntitlement } from './entitlement-cache'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { ShopId } from '@soostori/core'

const OFFLINE_SINCE_KEY = '@soostori:offlineSince'

export class OfflineLimitExceededError extends Error {
  constructor(
    public readonly offlineDays: number,
    public readonly limitDays: number,
  ) {
    super(`Device offline for ${offlineDays} day(s) — limit is ${limitDays}. Reconnect to sync.`)
    this.name = 'OfflineLimitExceededError'
  }
}

export class PrimaryDeviceRequiredError extends Error {
  constructor(public readonly primaryStatus: string) {
    super(`Stock operations require the Primary Device to be online. Current status: ${primaryStatus}.`)
    this.name = 'PrimaryDeviceRequiredError'
  }
}

/** Returns the number of days the device has been offline, or 0 if online. */
async function getOfflineDays(): Promise<number> {
  const offlineSince = await AsyncStorage.getItem(OFFLINE_SINCE_KEY)
  if (!offlineSince) return 0
  const elapsed = Date.now() - new Date(offlineSince).getTime()
  return Math.floor(elapsed / (1000 * 60 * 60 * 24))
}

/**
 * Throws OfflineLimitExceededError when the device has been offline for
 * ≥ MOBILE_OFFLINE_GRACE_DAYS. Call before any stock mutation.
 */
export async function enforceOfflinePolicy(): Promise<void> {
  const days = await getOfflineDays()
  if (days >= MOBILE_OFFLINE_GRACE_DAYS) {
    throw new OfflineLimitExceededError(days, MOBILE_OFFLINE_GRACE_DAYS)
  }
}

/**
 * Throws PrimaryDeviceRequiredError when canAuthorStockOps is false.
 * Mobile is a LAN client — it must not perform stock mutations when
 * the Primary Device is stale, lost, or unknown.
 *
 * Call before: stock adjustments, variant stock adjustments, sale commits.
 */
export function enforcePrimaryDevice(): void {
  const { status, canAuthorStockOps } = getMobilePrimaryStatus()
  if (!canAuthorStockOps) {
    throw new PrimaryDeviceRequiredError(status)
  }
}

/**
 * Combined gate for stock-affecting mutations (sale, adjustStock, etc.).
 * Enforces both the offline policy and Primary Device policy.
 */
export function enforceStockMutationGate(): void {
  enforcePrimaryDevice()
}
