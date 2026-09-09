// useMenuSync.ts — Menu sync status hook
import { useState, useEffect, useCallback } from 'react'
import { getPendingSyncCount } from '../services/sync-queue-helper'

const SYNC_INTERVAL_MS = 30_000

export function useMenuSync(menuOpen: boolean) {
  const [pendingSync, setPendingSync] = useState(0)
  const [syncing, setSyncing] = useState(false)

  const loadSync = useCallback(async () => {
    setSyncing(true)
    try { setPendingSync(await getPendingSyncCount()) } catch { /* ignore */ }
    setSyncing(false)
  }, [])

  useEffect(() => {
    if (menuOpen) loadSync()
    const id = setInterval(loadSync, SYNC_INTERVAL_MS)
    return () => clearInterval(id)
  }, [menuOpen, loadSync])

  return { pendingSync, syncing, loadSync }
}
