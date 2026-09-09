// mobile-update-downloader.ts — Update download/install logic for mobile updates
import { APP_VERSION } from '../../../lib/constants'
import type { UpdateProgress, UpdateStatus, SemVer } from '@soostori/updates'
import { computeProgress } from '@soostori/updates'

/** ISO 8601 timestamp string */
type ISO8601 = string

function isoNow(): ISO8601 {
  return new Date().toISOString()
}

const PROGRESS_POLL_MS = 500

async function getUpdates() {
  const expoModules = await import('expo-updates')
  return expoModules
}

export function buildInitialDownloadingStatus(currentStatus: UpdateStatus): UpdateStatus {
  return { ...currentStatus, state: 'DOWNLOADING', progress: undefined }
}

export function buildDownloadErrorStatus(
  currentStatus: UpdateStatus,
  msg: string,
  retryCount: number,
): UpdateStatus {
  return {
    state: 'ERROR',
    currentVersion: APP_VERSION as SemVer,
    error: { code: 'DOWNLOAD_FAILED', message: msg, retryCount },
    requiresRestart: false,
    lastCheckedAt: isoNow(),
    installedAt: currentStatus.installedAt,
  }
}

export function buildReadyToInstallStatus(currentStatus: UpdateStatus): UpdateStatus {
  return {
    state: 'READY_TO_INSTALL',
    currentVersion: APP_VERSION as SemVer,
    availableVersion: currentStatus.availableVersion,
    updateType: currentStatus.updateType ?? 'ota',
    requiresRestart: true,
    lastCheckedAt: isoNow(),
    installedAt: currentStatus.installedAt,
  }
}

export function startProgressTracking(
  onProgress: (p: UpdateProgress) => void,
): ReturnType<typeof setInterval> {
  let downloadedBytes = 0
  const totalBytes = 100_000_000 // Expo OTA bundles are typically ~50-100MB
  let startMs = Date.now()

  return setInterval(() => {
    const elapsedMs = Date.now() - startMs
    // Simulate download progress (expo-updates doesn't expose native progress)
    // Clamp at 95% so we never claim complete before fetchUpdateAsync resolves
    downloadedBytes = Math.min(
      downloadedBytes + Math.round(totalBytes * 0.08 + Math.random() * totalBytes * 0.02),
      Math.round(totalBytes * 0.95)
    )
    const fraction = Math.min(downloadedBytes / totalBytes, 0.95)
    void fraction
    const progress = computeProgress(downloadedBytes, totalBytes, elapsedMs)
    onProgress(progress)
  }, PROGRESS_POLL_MS)
}

export function stopProgressTracking(timer: ReturnType<typeof setInterval> | null): void {
  if (timer !== null) {
    clearInterval(timer)
  }
}

export async function fetchUpdate(): Promise<void> {
  const Updates = await getUpdates()
  await Updates.fetchUpdateAsync()
}

export async function reloadApp(): Promise<void> {
  const Updates = await getUpdates()
  await Updates.reloadAsync()
}
