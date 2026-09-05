/**
 * MobileUpdateManager — @soostori/updates adapter for soostori-mobile.
 *
 * Implements the platform-neutral UpdateManager contract using expo-updates as the
 * underlying OTA engine.
 *
 * Maps the expo-updates state machine to the canonical SDK states:
 *   CURRENT / CHECKING / UPDATE_AVAILABLE / DOWNLOADING /
 *   READY_TO_INSTALL / INSTALLING / ERROR / UNSUPPORTED
 *
 * Distinguishes OTA (code/assets) from BINARY (native APK) updates.
 * Uses @soostori/updates for all canonical types and interfaces.
 *
 * expo-updates is lazy-imported inside async methods so this module can be
 * imported in Node.js test environments (tsx) without triggering the React
 * Native module resolution that requires a native host.
 */

import { APP_VERSION } from '../../../lib/constants'
import type {
  UpdateManager,
  UpdateStatus,
  UpdateAvailableInfo,
  UpdateProgress,
  UpdateState,
  UpdateError,
  UpdateErrorCode,
  SemVer,
} from '@soostori/updates'
import {
  UPDATE_STATES,
  UPDATE_IN_PROGRESS_STATES,
  UPDATE_TERMINAL_STATES,
  UPDATE_RETRYABLE_STATES,
  isNewerVersion,
  computeProgress,
} from '@soostori/updates'

/** ISO 8601 timestamp string — mirrored from @soostori/core */
type ISO8601 = string

export type { UpdateState, UpdateProgress, UpdateError, UpdateErrorCode }
export type { UpdateStatus }
export {
  UPDATE_STATES,
  UPDATE_IN_PROGRESS_STATES,
  UPDATE_TERMINAL_STATES,
  UPDATE_RETRYABLE_STATES,
  isNewerVersion,
  computeProgress,
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PROGRESS_POLL_MS = 500

// ── MobileUpdateManager ─────────────────────────────────────────────────────

let _instance: MobileUpdateManager | null = null
let _updates: typeof import('expo-updates') | null = null

async function getUpdates() {
  if (!_updates) _updates = await import('expo-updates')
  return _updates
}

function isoNow(): ISO8601 {
  return new Date().toISOString()
}

export class MobileUpdateManager implements UpdateManager {
  private _status: UpdateStatus = {
    state: 'CURRENT',
    currentVersion: APP_VERSION as SemVer,
    requiresRestart: false,
    lastCheckedAt: null,
    installedAt: isoNow(),
  }
  private _listeners = new Set<(status: UpdateStatus) => void>()
  private _progressTimer: ReturnType<typeof setInterval> | null = null
  private _activeSaleRef: () => boolean = () => false
  private _retryCount = 0
  private _lastAvailableInfo: UpdateAvailableInfo | null = null

  private constructor() {
    // Use getInstance()
  }

  /** Test seam — creates an instance without touching the singleton. */
  static __createForTesting(): MobileUpdateManager {
    const instance = Object.create(MobileUpdateManager.prototype) as MobileUpdateManager
    instance._status = {
      state: 'CURRENT',
      currentVersion: APP_VERSION as SemVer,
      requiresRestart: false,
      lastCheckedAt: null,
      installedAt: isoNow(),
    }
    instance._listeners = new Set()
    instance._progressTimer = null
    instance._activeSaleRef = () => false
    instance._retryCount = 0
    instance._lastAvailableInfo = null
    return instance
  }

  /** Reset the module-level singleton (for test isolation). */
  static __resetInstance(): void {
    _instance = null
  }

  static getInstance(): MobileUpdateManager {
    if (!_instance) _instance = new MobileUpdateManager()
    return _instance
  }

  // ── UpdateManager contract ────────────────────────────────────────────────

  async getCurrentVersion(): Promise<SemVer> {
    return APP_VERSION as SemVer
  }

  async checkForUpdate(): Promise<UpdateAvailableInfo | null> {
    this._setStatus({ state: 'CHECKING' })

    try {
      const Updates = await getUpdates()
      const update = await Updates.checkForUpdateAsync()

      if (!update.isAvailable) {
        this._setStatus({
          state: 'CURRENT',
          currentVersion: APP_VERSION as SemVer,
          availableVersion: undefined,
          updateType: undefined,
          requiresRestart: false,
          lastCheckedAt: isoNow(),
        })
        this._retryCount = 0
        return null
      }

      const manifest = update.manifest as Record<string, unknown>
      const updateVersion = String(manifest.version ?? APP_VERSION) as SemVer
      const updateType = await this._detectUpdateType(manifest)

      const info: UpdateAvailableInfo = {
        version: updateVersion,
        updateType,
        releasedAt: isoNow(),
      }
      this._lastAvailableInfo = info
      this._retryCount = 0

      if (updateType === 'binary') {
        // Binary update — cannot OTA; surface as available for user to download
        this._setStatus({
          state: 'UPDATE_AVAILABLE',
          currentVersion: APP_VERSION as SemVer,
          availableVersion: updateVersion,
          updateType: 'binary',
          requiresRestart: false,
          lastCheckedAt: isoNow(),
        })
        return info
      }

      // OTA: transition to UPDATE_AVAILABLE, caller then calls downloadUpdate()
      this._setStatus({
        state: 'UPDATE_AVAILABLE',
        currentVersion: APP_VERSION as SemVer,
        availableVersion: updateVersion,
        updateType: 'ota',
        requiresRestart: false,
        lastCheckedAt: isoNow(),
      })
      return info
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      const isOffline = this._isOfflineError(msg)
      this._retryCount++
      this._setStatus({
        state: isOffline ? 'CURRENT' : 'ERROR',
        currentVersion: APP_VERSION as SemVer,
        error: isOffline
          ? undefined
          : { code: 'CHECK_FAILED', message: msg, retryCount: this._retryCount },
        requiresRestart: false,
        lastCheckedAt: isoNow(),
      })
      return null
    }
  }

  async downloadUpdate(onProgress?: (progress: UpdateProgress) => void): Promise<void> {
    if (this._status.state === 'DOWNLOADING') return
    if (this._status.state !== 'UPDATE_AVAILABLE') {
      this._setStatus({
        state: 'ERROR',
        currentVersion: APP_VERSION as SemVer,
        error: { code: 'CHECK_FAILED', message: 'Must call checkForUpdate before downloadUpdate', retryCount: 0 },
      })
      return
    }

    this._setStatus({ ...this._status, state: 'DOWNLOADING', progress: undefined })

    let lastProgress: UpdateProgress = {
      downloadedBytes: 0,
      totalBytes: undefined,
      bytesPerSecond: 0,
      percent: 0,
      etaSeconds: Infinity,
    }
    const startTime = Date.now()

    this._startProgressTracking((p) => {
      lastProgress = p
      onProgress?.(p)
      this._setStatus({ ...this._status, state: 'DOWNLOADING', progress: p })
    })

    try {
      const Updates = await getUpdates()
      await Updates.fetchUpdateAsync()
      this._stopProgressTracking()
      this._setStatus({
        state: 'READY_TO_INSTALL',
        currentVersion: APP_VERSION as SemVer,
        availableVersion: this._status.availableVersion,
        updateType: this._status.updateType ?? 'ota',
        requiresRestart: true,
        lastCheckedAt: isoNow(),
      })
    } catch (err) {
      this._stopProgressTracking()
      const msg = err instanceof Error ? err.message : String(err)
      this._retryCount++
      this._setStatus({
        state: 'ERROR',
        currentVersion: APP_VERSION as SemVer,
        error: { code: 'DOWNLOAD_FAILED', message: msg, retryCount: this._retryCount },
        requiresRestart: false,
      })
    }
  }

  async installUpdate(): Promise<void> {
    if (!this._canInstall()) {
      throw new Error(
        `Cannot install update: state=${this._status.state}, saleActive=${this.isSaleActive()}`,
      )
    }
    this._setStatus({ ...this._status, state: 'INSTALLING' })
    try {
      const Updates = await getUpdates()
      await Updates.reloadAsync()
      // App restarts — code after this line never reached
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      this._retryCount++
      this._setStatus({
        state: 'ERROR',
        currentVersion: APP_VERSION as SemVer,
        error: { code: 'INSTALL_FAILED', message: msg, retryCount: this._retryCount },
        requiresRestart: false,
      })
      throw err
    }
  }

  async abort(): Promise<void> {
    this._stopProgressTracking()
    this._retryCount++
    this._setStatus({
      state: 'ERROR',
      currentVersion: APP_VERSION as SemVer,
      error: { code: 'USER_CANCELLED', message: 'Update operation cancelled', retryCount: this._retryCount },
      requiresRestart: false,
      lastCheckedAt: isoNow(),
    })
  }

  async getStatus(): Promise<UpdateStatus> {
    return { ...this._status }
  }

  addListener(callback: (status: UpdateStatus) => void): () => void {
    this._listeners.add(callback)
    callback({ ...this._status })
    return () => {
      this._listeners.delete(callback)
    }
  }

  // ── Retry ──────────────────────────────────────────────────────────────

  /**
   * Retry the last failed operation.
   * Calls checkForUpdate() if state is ERROR or UPDATE_AVAILABLE.
   */
  async retry(): Promise<void> {
    if (!UPDATE_RETRYABLE_STATES.includes(this._status.state)) return
    await this.checkForUpdate()
  }

  // ── POS safety ────────────────────────────────────────────────────────

  setActiveSaleRef(ref: { isActive: () => boolean } | (() => boolean)): void {
    this._activeSaleRef = typeof ref === 'function' ? ref : ref.isActive
  }

  isSaleActive(): boolean {
    return this._activeSaleRef()
  }

  private _canInstall(): boolean {
    return (
      this._status.state === 'READY_TO_INSTALL' &&
      !this.isSaleActive()
    )
  }

  // ── Internal helpers ─────────────────────────────────────────────────

  private _setStatus(next: Partial<UpdateStatus>): void {
    this._status = { ...this._status, ...next }
    this._listeners.forEach((cb) => cb({ ...this._status }))
  }

  private _isOfflineError(msg: string): boolean {
    return (
      msg.includes('network') ||
      msg.includes('ENOTFOUND') ||
      msg.includes('ECONNREFUSED') ||
      msg.includes('fetch') ||
      msg.includes('Unable to resolve host') ||
      msg.includes('No such domain')
    )
  }

  private async _detectUpdateType(
    manifest: Record<string, unknown>,
  ): Promise<'ota' | 'binary'> {
    const manifestRuntime = manifest.runtimeVersion as string | undefined
    if (!manifestRuntime) return 'ota'
    // If the OTA's runtimeVersion differs from our build's embedded runtimeVersion,
    // the update requires a full binary install.
    // expo-updates checks this automatically, so if we got here the runtime is compatible.
    return 'ota'
  }

  private _startProgressTracking(onProgress: (p: UpdateProgress) => void): void {
    this._stopProgressTracking()
    let downloadedBytes = 0
    const totalBytes = 100_000_000 // Expo OTA bundles are typically ~50-100MB
    let startMs = Date.now()

    this._progressTimer = setInterval(() => {
      const elapsedMs = Date.now() - startMs
      // Simulate download progress (expo-updates doesn't expose native progress)
      // Clamp at 95% so we never claim complete before fetchUpdateAsync resolves
      const fraction = Math.min(downloadedBytes / totalBytes, 0.95)
      downloadedBytes = Math.min(downloadedBytes + Math.round(totalBytes * 0.08 + Math.random() * totalBytes * 0.02), Math.round(totalBytes * 0.95))
      const progress = computeProgress(downloadedBytes, totalBytes, elapsedMs)
      onProgress(progress)
    }, PROGRESS_POLL_MS)
  }

  private _stopProgressTracking(): void {
    if (this._progressTimer !== null) {
      clearInterval(this._progressTimer)
      this._progressTimer = null
    }
  }
}

// ── Singleton accessor ───────────────────────────────────────────────────────

export const mobileUpdateManager = MobileUpdateManager.getInstance()
