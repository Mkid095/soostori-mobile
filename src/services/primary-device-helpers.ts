// primary-device-helpers.ts — Phase 15: PrimaryDeviceCoordinator UI helpers
import type { PrimaryDeviceState } from '@soostori/devices'

export function primaryHealthLabel(state: PrimaryDeviceState): string {
  if (state.primaryId === null) return 'No Primary'
  switch (state.status) {
    case 'online': return 'Primary Online'
    case 'stale': return 'Primary Stale'
    case 'lost': return 'Primary Lost'
    default: return 'Unknown'
  }
}

export function primaryHealthColor(state: PrimaryDeviceState): string {
  if (state.primaryId === null) return '#94A3B8'
  switch (state.status) {
    case 'online': return '#22c55e'
    case 'stale': return '#f59e0b'
    case 'lost': return '#ef4444'
    default: return '#94A3B8'
  }
}
