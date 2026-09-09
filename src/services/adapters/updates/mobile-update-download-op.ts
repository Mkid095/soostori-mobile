// mobile-update-download-op.ts — Download update operation
import { APP_VERSION } from '../../../lib/constants'
import type { UpdateProgress, UpdateStatus } from '@soostori/updates'
import { buildInitialDownloadingStatus, buildReadyToInstallStatus } from './mobile-update-downloader'
import { startProgressTracking, createInitialProgress } from './mobile-update-progress'
import { fetchUpdate } from './mobile-update-downloader'

export interface DownloadDeps {
  status: UpdateStatus
  progressTimer: ReturnType<typeof setInterval> | null
  retryCount: number
  setStatus: (s: UpdateStatus) => void
  cleanupProgress: () => void
  errorStatus: (code: string, msg: string, retryCount: number) => UpdateStatus
}

export async function downloadUpdateOp(
  deps: DownloadDeps,
  onProgress?: (p: UpdateProgress) => void,
): Promise<void> {
  if (deps.status.state === 'DOWNLOADING') return
  if (deps.status.state !== 'UPDATE_AVAILABLE') {
    deps.setStatus(deps.errorStatus('CHECK_FAILED', 'Must call checkForUpdate before downloadUpdate', 0))
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
    deps.setStatus(deps.errorStatus('DOWNLOAD_FAILED', err instanceof Error ? err.message : String(err), deps.retryCount))
  }
}
