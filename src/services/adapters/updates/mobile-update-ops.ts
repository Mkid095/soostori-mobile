// mobile-update-ops.ts — Core update operations (check, download, install)
import { APP_VERSION } from '../../../lib/constants'
import type { UpdateAvailableInfo, UpdateProgress, UpdateStatus } from '@soostori/updates'
import { UPDATE_RETRYABLE_STATES } from '@soostori/updates'
import { checkForUpdate } from './mobile-update-checker'
import {
  buildInitialDownloadingStatus,
  buildReadyToInstallStatus,
} from './mobile-update-downloader'
import {
  startProgressTracking,
  stopProgressTracking,
  createInitialProgress,
} from './mobile-update-progress'
import { fetchUpdate, reloadApp } from './mobile-update-downloader'
import {
  createCheckFailedStatus,
  createInstallFailedStatus,
  createUserCancelledStatus,
  parseErrorMessage,
} from './mobile-update-errors'

type ISO8601 = string

function isoNow(): ISO8601 {
  return new Date().toISOString()
}

export interface UpdateOpsDeps {
  status: UpdateStatus
  progressTimer: ReturnType<typeof setInterval> | null
  retryCount: number
  isSaleActive: boolean
  setStatus: (s: UpdateStatus) => void
  cleanupProgress: () => void
}

export async function opCheckForUpdate(
  deps: UpdateOpsDeps,
  lastInfo: UpdateAvailableInfo | null,
): Promise<UpdateAvailableInfo | null> {
  const result = await checkForUpdate(deps.status, deps.retryCount)
  deps.retryCount = result.error ? result.error.retryCount : 0
  deps.setStatus(result.status)
  if (result.info) lastInfo = result.info
  return result.info
}

export async function opDownloadUpdate(
  deps: UpdateOpsDeps,
  onProgress?: (p: UpdateProgress) => void,
): Promise<void> {
  if (deps.status.state === 'DOWNLOADING') return
  if (deps.status.state !== 'UPDATE_AVAILABLE') {
    deps.setStatus(createCheckFailedStatus(0))
    return
  }

  deps.setStatus(buildInitialDownloadingStatus(deps.status))
  let lastProgress = createInitialProgress()

  deps.progressTimer = startProgressTracking((p) => {
    lastProgress = p
    onProgress?.(p)
    deps.setStatus({ ...deps.status, state: 'DOWNLOADING', progress: p })
  })

  try {
    await fetchUpdate()
    deps.cleanupProgress()
    deps.setStatus(buildReadyToInstallStatus(deps.status))
  } catch (err) {
    deps.cleanupProgress()
    deps.retryCount++
    const msg = parseErrorMessage(err)
    deps.setStatus({
      state: 'ERROR',
      currentVersion: APP_VERSION,
      error: { code: 'DOWNLOAD_FAILED', message: msg, retryCount: deps.retryCount },
      requiresRestart: false,
      lastCheckedAt: isoNow(),
      installedAt: deps.status.installedAt,
    })
  }
}

export async function opInstallUpdate(deps: UpdateOpsDeps): Promise<void> {
  if (deps.status.state !== 'READY_TO_INSTALL' || deps.isSaleActive) {
    throw new Error(`Cannot install update: state=${deps.status.state}, saleActive=${deps.isSaleActive}`)
  }
  deps.setStatus({ ...deps.status, state: 'INSTALLING' })
  try {
    await reloadApp()
  } catch (err) {
    deps.retryCount++
    deps.setStatus(createInstallFailedStatus(parseErrorMessage(err), deps.retryCount))
    throw err
  }
}

export function opAbort(deps: UpdateOpsDeps): void {
  deps.cleanupProgress()
  deps.retryCount++
  deps.setStatus(createUserCancelledStatus(deps.retryCount))
}

export function opRetry(deps: UpdateOpsDeps): boolean {
  return UPDATE_RETRYABLE_STATES.includes(deps.status.state)
}
