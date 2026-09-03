// useCloudSync — starts sync worker when component mounts
// Phase 4 — worker attempts upload regardless of grace window; server enforces auth
import { useEffect } from 'react'
import { startSyncWorker, stopSyncWorker } from '../services/sync-queue-processor'

export function useCloudSync() {
  useEffect(() => {
    startSyncWorker()
    return () => stopSyncWorker()
  }, [])
}
