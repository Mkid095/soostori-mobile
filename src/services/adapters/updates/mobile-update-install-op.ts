// mobile-update-install-op.ts — Install update operation
import type { UpdateStatus } from '@soostori/updates'
import { reloadApp } from './mobile-update-downloader'

export interface InstallDeps {
  status: UpdateStatus
  retryCount: number
  isSaleActive: boolean
  setStatus: (s: UpdateStatus) => void
  errorStatus: (code: string, msg: string, retryCount: number) => UpdateStatus
}

export async function installUpdateOp(deps: InstallDeps): Promise<void> {
  if (deps.status.state !== 'READY_TO_INSTALL' || deps.isSaleActive) {
    throw new Error(`Cannot install update: state=${deps.status.state}, saleActive=${deps.isSaleActive}`)
  }
  deps.setStatus({ ...deps.status, state: 'INSTALLING' })
  try {
    await reloadApp()
  } catch (err) {
    deps.retryCount++
    deps.setStatus(deps.errorStatus('INSTALL_FAILED', err instanceof Error ? err.message : String(err), deps.retryCount))
    throw err
  }
}
