// useCloudSync — starts sync worker when entitlement is valid
import { useEffect } from 'react'
import { startSyncWorker, stopSyncWorker } from '../services/sync-queue-processor'
import { isWithinGraceWindow } from '../services/entitlement-cache'

export function useCloudSync() {
  useEffect(() => {
    isWithinGraceWindow().then(valid => {
      if (valid) startSyncWorker()
    })
    return () => stopSyncWorker()
  }, [])
}
