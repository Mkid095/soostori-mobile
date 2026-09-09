// mobile-update-check-op.ts — Check for update operation
import { APP_VERSION } from '../../../lib/constants'
import type { UpdateAvailableInfo, UpdateStatus } from '@soostori/updates'
import { checkForUpdate } from './mobile-update-checker'

export async function opCheckForUpdate(
  status: UpdateStatus,
  retryCount: number,
  setStatus: (s: UpdateStatus) => void,
): Promise<{ info: UpdateAvailableInfo | null; retryCount: number }> {
  setStatus({ ...status, state: 'CHECKING' })
  const result = await checkForUpdate(status, retryCount)
  setStatus(result.status)
  return { info: result.info, retryCount: result.error ? result.error.retryCount : retryCount }
}
