// mobile-update-checker.ts — Update check logic for mobile updates
import { APP_VERSION } from '../../../lib/constants'
import type { UpdateAvailableInfo, SemVer } from '@soostori/updates'
import type { UpdateStatus } from '@soostori/updates'

/** ISO 8601 timestamp string */
type ISO8601 = string

function isoNow(): ISO8601 {
  return new Date().toISOString()
}

async function getUpdates() {
  const expoModules = await import('expo-updates')
  return expoModules
}

function isOfflineError(msg: string): boolean {
  return (
    msg.includes('network') ||
    msg.includes('ENOTFOUND') ||
    msg.includes('ECONNREFUSED') ||
    msg.includes('fetch') ||
    msg.includes('Unable to resolve host') ||
    msg.includes('No such domain')
  )
}

async function detectUpdateType(
  manifest: Record<string, unknown>,
): Promise<'ota' | 'binary'> {
  const manifestRuntime = manifest.runtimeVersion as string | undefined
  if (!manifestRuntime) return 'ota'
  // If the OTA's runtimeVersion differs from our build's embedded runtimeVersion,
  // the update requires a full binary install.
  // expo-updates checks this automatically, so if we got here the runtime is compatible.
  return 'ota'
}

export interface CheckResult {
  info: UpdateAvailableInfo | null
  status: UpdateStatus
  error: { code: string; message: string; retryCount: number } | undefined
}

export async function checkForUpdate(
  currentStatus: UpdateStatus,
  retryCount: number,
): Promise<CheckResult> {
  try {
    const Updates = await getUpdates()
    const update = await Updates.checkForUpdateAsync()

    if (!update.isAvailable) {
      return {
        info: null,
        status: {
          state: 'CURRENT',
          currentVersion: APP_VERSION as SemVer,
          availableVersion: undefined,
          updateType: undefined,
          requiresRestart: false,
          lastCheckedAt: isoNow(),
          installedAt: isoNow(),
        },
        error: undefined,
      }
    }

    const manifest = update.manifest as Record<string, unknown>
    const updateVersion = String(manifest.version ?? APP_VERSION) as SemVer
    const updateType = await detectUpdateType(manifest)

    const info: UpdateAvailableInfo = {
      version: updateVersion,
      updateType,
      releasedAt: isoNow(),
    }

    if (updateType === 'binary') {
      return {
        info,
        status: {
          state: 'UPDATE_AVAILABLE',
          currentVersion: APP_VERSION as SemVer,
          availableVersion: updateVersion,
          updateType: 'binary',
          requiresRestart: false,
          lastCheckedAt: isoNow(),
          installedAt: isoNow(),
        },
        error: undefined,
      }
    }

    return {
      info,
      status: {
        state: 'UPDATE_AVAILABLE',
        currentVersion: APP_VERSION as SemVer,
        availableVersion: updateVersion,
        updateType: 'ota',
        requiresRestart: false,
        lastCheckedAt: isoNow(),
        installedAt: isoNow(),
      },
      error: undefined,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const isOffline = isOfflineError(msg)
    return {
      info: null,
      status: {
        state: isOffline ? 'CURRENT' : 'ERROR',
        currentVersion: APP_VERSION as SemVer,
        error: isOffline
          ? undefined
          : { code: 'CHECK_FAILED', message: msg, retryCount: retryCount + 1 },
        requiresRestart: false,
        lastCheckedAt: isoNow(),
        installedAt: isoNow(),
      },
      error: isOffline
        ? undefined
        : { code: 'CHECK_FAILED', message: msg, retryCount: retryCount + 1 },
    }
  }
}
