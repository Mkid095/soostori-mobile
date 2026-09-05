/**
 * Mobile Primary Device coordinator — single canonical authority.
 *
 * Phase 11.3e (Mobile Commerce) — wraps @soostori/devices.PrimaryDeviceCoordinator
 * for the Mobile runtime. Mobile does not need to be the Primary; this is
 * the consumer/terminal side that listens for Primary heartbeats.
 */

import { asShopId, asDeviceId, type UUID, type ShopId } from '@soostori/core'
import {
  PrimaryDeviceCoordinator,
  type Heartbeat,
  type PrimaryDeviceState,
} from '@soostori/devices'

const STALE_THRESHOLD_MS = 15_000
const LOST_THRESHOLD_MS = 60_000

type PrimaryStatusName = 'online' | 'stale' | 'lost' | 'unknown'
export interface MobilePrimaryStatus {
  status: PrimaryStatusName
  canAuthorStockOps: boolean
}

let _coord: PrimaryDeviceCoordinator | null = null
let _shopId: ShopId | null = null
let _localDeviceId: UUID | null = null

export function initMobilePrimaryCoordinator(opts: { shopId: string; deviceId: string }): void {
  _shopId = asShopId(opts.shopId)
  _localDeviceId = asDeviceId(opts.deviceId)
  if (_coord) return
  _coord = new PrimaryDeviceCoordinator({
    shopId: _shopId,
    deviceId: _localDeviceId,
    config: { freshnessMs: STALE_THRESHOLD_MS, lostGraceMs: LOST_THRESHOLD_MS },
  })
}

export function ingestPrimaryHeartbeat(fromDeviceId: string, timestampMs: number): void {
  if (!_coord || !_shopId || !_localDeviceId) return
  const hb: Heartbeat = {
    deviceId: fromDeviceId as UUID,
    shopId: _shopId,
    timestamp: new Date(timestampMs).toISOString(),
    isPrimary: true,
    reachable: true,
    stockSequence: 0,
  }
  _coord.ingestHeartbeat(hb)
}

export function tickMobilePrimary(nowMs?: number): void {
  if (_coord) _coord.tick(nowMs ?? Date.now())
}

function mapStateToStatusName(state: PrimaryDeviceState): PrimaryStatusName {
  const ps = state.status
  if (ps === 'online') return 'online'
  if (ps === 'stale') return 'stale'
  if (ps === 'lost') return 'lost'
  if (state.primaryId === null) return 'unknown'
  return 'unknown'
}

/**
 * Mobile Primary accessor — single source of truth.
 * Mirrors Desktop's primary-coordinator.ts semantics so committed-sale paths
 * use one canonical authorization decision on both platforms.
 */
export function getMobilePrimaryStatus(): MobilePrimaryStatus {
  if (!_coord) return { status: 'unknown', canAuthorStockOps: false }
  const state = _coord.getPrimaryState()
  const status = mapStateToStatusName(state)
  const canAuthorStockOps = _coord.canAuthorStockOps()
  if (status === 'online') return { status, canAuthorStockOps: true }
  return { status, canAuthorStockOps: false }
}

export const MOBILE_PRIMARY_THRESHOLDS = {
  STALE_MS: STALE_THRESHOLD_MS,
  LOST_MS: LOST_THRESHOLD_MS,
} as const
