// mobile-update-errors.ts — Error factory functions for update manager
import { APP_VERSION } from '../../../lib/constants'
import type { UpdateStatus } from '@soostori/updates'

type ISO8601 = string

function isoNow(): ISO8601 {
  return new Date().toISOString()
}

export function createCheckFailedStatus(retryCount: number): UpdateStatus {
  return {
    state: 'ERROR',
    currentVersion: APP_VERSION,
    error: { code: 'CHECK_FAILED', message: 'Must call checkForUpdate before downloadUpdate', retryCount },
    requiresRestart: false,
    lastCheckedAt: isoNow(),
    installedAt: isoNow(),
  }
}

export function createInstallFailedStatus(msg: string, retryCount: number): UpdateStatus {
  return {
    state: 'ERROR',
    currentVersion: APP_VERSION,
    error: { code: 'INSTALL_FAILED', message: msg, retryCount },
    requiresRestart: false,
    lastCheckedAt: isoNow(),
    installedAt: isoNow(),
  }
}

export function createUserCancelledStatus(retryCount: number): UpdateStatus {
  return {
    state: 'ERROR',
    currentVersion: APP_VERSION,
    error: { code: 'USER_CANCELLED', message: 'Update operation cancelled', retryCount },
    requiresRestart: false,
    lastCheckedAt: isoNow(),
    installedAt: isoNow(),
  }
}

export function parseErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}
