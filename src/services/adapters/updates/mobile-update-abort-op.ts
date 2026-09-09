// mobile-update-abort-op.ts — Abort update operation
import { APP_VERSION } from '../../../lib/constants'
import type { UpdateStatus } from '@soostori/updates'
import { stopProgressTracking } from './mobile-update-progress'

export function opAbort(
  status: UpdateStatus,
  progressTimer: ReturnType<typeof setInterval> | null,
  retryCount: number,
  setStatus: (s: UpdateStatus) => void,
): void {
  stopProgressTracking(progressTimer)
  const newRetryCount = retryCount + 1
  setStatus({
    state: 'ERROR',
    currentVersion: APP_VERSION,
    error: { code: 'USER_CANCELLED', message: 'Update operation cancelled', retryCount: newRetryCount },
    requiresRestart: false,
    lastCheckedAt: status.lastCheckedAt ?? new Date().toISOString(),
    installedAt: status.installedAt,
  })
}
