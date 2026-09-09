// mobile-update-status.ts — UpdateStatus helpers and POS safety
import { APP_VERSION } from '../../../lib/constants'
import type { UpdateStatus, SemVer } from '@soostori/updates'

type ISO8601 = string
type UpdateErrorCode = 'CHECK_FAILED' | 'DOWNLOAD_FAILED' | 'INSTALL_FAILED' | 'USER_CANCELLED'

function isoNow(): ISO8601 {
  return new Date().toISOString()
}

export function createInitialStatus(): UpdateStatus {
  return {
    state: 'CURRENT',
    currentVersion: APP_VERSION as SemVer,
    requiresRestart: false,
    lastCheckedAt: null,
    installedAt: isoNow(),
  }
}

export function createErrorStatus(
  code: UpdateErrorCode,
  message: string,
  retryCount: number,
  installedAt: ISO8601,
): UpdateStatus {
  return {
    state: 'ERROR',
    currentVersion: APP_VERSION as SemVer,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    error: { code: code as any, message, retryCount },
    requiresRestart: false,
    lastCheckedAt: isoNow(),
    installedAt,
  }
}

export function isInstallable(status: UpdateStatus, isSaleActive: boolean): boolean {
  return status.state === 'READY_TO_INSTALL' && !isSaleActive
}
