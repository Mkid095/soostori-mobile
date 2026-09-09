// useUpdateChecker.ts — Update state subscription hook
import { useState, useEffect } from 'react'
import { mobileUpdateManager, type UpdateStatus } from '../services/adapters/updates/mobile-update-manager'
import { APP_VERSION } from '../lib/constants'

export function useUpdateChecker() {
  const [status, setStatus] = useState<UpdateStatus>({
    state: 'CURRENT',
    currentVersion: APP_VERSION as string,
    requiresRestart: false,
    lastCheckedAt: null,
    installedAt: null,
  })

  useEffect(() => {
    return mobileUpdateManager.addListener((s) => setStatus(s))
  }, [])

  return status
}
