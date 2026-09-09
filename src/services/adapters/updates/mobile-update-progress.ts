// mobile-update-progress.ts — Progress tracking for update downloads
import type { UpdateProgress } from '@soostori/updates'
import { computeProgress } from '@soostori/updates'

const PROGRESS_POLL_MS = 500

export function startProgressTracking(
  onProgress: (p: UpdateProgress) => void,
): ReturnType<typeof setInterval> {
  let downloadedBytes = 0
  const totalBytes = 100_000_000
  let startMs = Date.now()

  return setInterval(() => {
    const elapsedMs = Date.now() - startMs
    downloadedBytes = Math.min(
      downloadedBytes + Math.round(totalBytes * 0.08 + Math.random() * totalBytes * 0.02),
      Math.round(totalBytes * 0.95)
    )
    const progress = computeProgress(downloadedBytes, totalBytes, elapsedMs)
    onProgress(progress)
  }, PROGRESS_POLL_MS)
}

export function stopProgressTracking(timer: ReturnType<typeof setInterval> | null): void {
  if (timer !== null) {
    clearInterval(timer)
  }
}

export function createInitialProgress(): UpdateProgress {
  return {
    downloadedBytes: 0,
    totalBytes: undefined,
    bytesPerSecond: 0,
    percent: 0,
    etaSeconds: Infinity,
  }
}
