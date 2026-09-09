/**
 * MobileUpdateManager — @soostori/updates adapter for soostori-mobile.
 * Implements the platform-neutral UpdateManager contract using expo-updates.
 */

import { APP_VERSION } from '../../../lib/constants'
import type { UpdateManager, UpdateStatus, UpdateAvailableInfo, UpdateProgress, SemVer } from '@soostori/updates'
import { UPDATE_RETRYABLE_STATES } from '@soostori/updates'
import { stopProgressTracking } from './mobile-update-progress'
import { opCheckForUpdate } from './mobile-update-check-op'
import { opAbort } from './mobile-update-abort-op'
import { downloadUpdateOp } from './mobile-update-download-op'
import { installUpdateOp } from './mobile-update-install-op'

export type { UpdateProgress }
export type { UpdateStatus }
export { UPDATE_RETRYABLE_STATES }

type ISO8601 = string
function isoNow(): ISO8601 { return new Date().toISOString() }

let _instance: MobileUpdateManager | null = null

export class MobileUpdateManager implements UpdateManager {
  private _status: UpdateStatus
  private _listeners = new Set<(status: UpdateStatus) => void>()
  private _progressTimer: ReturnType<typeof setInterval> | null = null
  private _activeSaleRef: () => boolean = () => false
  private _retryCount = 0
  private _lastAvailableInfo: UpdateAvailableInfo | null = null

  private constructor() {
    this._status = { state: 'CURRENT', currentVersion: APP_VERSION as SemVer, requiresRestart: false, lastCheckedAt: null, installedAt: isoNow() }
  }

  static __createForTesting(): MobileUpdateManager {
    const m = Object.create(MobileUpdateManager.prototype) as MobileUpdateManager
    m._status = m._initialStatus(); m._listeners = new Set(); m._progressTimer = null
    m._activeSaleRef = () => false; m._retryCount = 0; m._lastAvailableInfo = null; return m
  }

  static __resetInstance(): void { _instance = null }
  static getInstance(): MobileUpdateManager { if (!_instance) _instance = new MobileUpdateManager(); return _instance }

  private _initialStatus(): UpdateStatus {
    return { state: 'CURRENT', currentVersion: APP_VERSION as SemVer, requiresRestart: false, lastCheckedAt: null, installedAt: isoNow() }
  }

  async getCurrentVersion(): Promise<SemVer> { return APP_VERSION as SemVer }

  async checkForUpdate(): Promise<UpdateAvailableInfo | null> {
    const result = await opCheckForUpdate(this._status, this._retryCount, (s) => this._setStatus(s))
    this._retryCount = result.retryCount
    if (result.info) this._lastAvailableInfo = result.info
    return result.info
  }

  async downloadUpdate(onProgress?: (progress: UpdateProgress) => void): Promise<void> {
    await downloadUpdateOp({
      status: this._status, progressTimer: this._progressTimer, retryCount: this._retryCount,
      setStatus: (s) => this._setStatus(s), cleanupProgress: () => this._cleanupProgress(),
      errorStatus: (code, msg, rc) => this._errorStatus(code, msg, rc),
    }, onProgress)
  }

  async installUpdate(): Promise<void> {
    await installUpdateOp({
      status: this._status, retryCount: this._retryCount, isSaleActive: this.isSaleActive(),
      setStatus: (s) => this._setStatus(s), errorStatus: (code, msg, rc) => this._errorStatus(code, msg, rc),
    })
  }

  async abort(): Promise<void> { opAbort(this._status, this._progressTimer, this._retryCount, (s) => this._setStatus(s)) }
  async getStatus(): Promise<UpdateStatus> { return { ...this._status } }

  addListener(callback: (status: UpdateStatus) => void): () => void {
    this._listeners.add(callback); callback({ ...this._status }); return () => this._listeners.delete(callback)
  }

  async retry(): Promise<void> { if (!UPDATE_RETRYABLE_STATES.includes(this._status.state)) return; await this.checkForUpdate() }
  setActiveSaleRef(ref: { isActive: () => boolean } | (() => boolean)): void { this._activeSaleRef = typeof ref === 'function' ? ref : ref.isActive }
  isSaleActive(): boolean { return this._activeSaleRef() }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _errorStatus(code: string, message: string, retryCount: number): UpdateStatus {
    return { state: 'ERROR', currentVersion: APP_VERSION as SemVer, error: { code: code as any, message, retryCount }, requiresRestart: false, lastCheckedAt: isoNow(), installedAt: this._status.installedAt }
  }

  private _setStatus(next: Partial<UpdateStatus>): void { this._status = { ...this._status, ...next }; this._listeners.forEach((cb) => cb({ ...this._status })) }
  private _cleanupProgress(): void { stopProgressTracking(this._progressTimer); this._progressTimer = null }
}

export const mobileUpdateManager = MobileUpdateManager.getInstance()
