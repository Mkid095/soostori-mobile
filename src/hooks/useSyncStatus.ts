// useSyncStatus.ts — Phase 16: unified sync status for UI
// Returns { pending, failed, lastSyncAt, isOnline } for the bottom tab bar

import { useState, useEffect, useCallback } from 'react'
import NetInfo from '@react-native-community/netinfo'
import { getSyncStatus } from '../services/mobile-sync-service'
import type { SyncStatus } from '../services/mobile-sync-service'

const REFRESH_INTERVAL_MS = 30_000 // 30s poll

export interface SyncStatusInfo {
  pending: number
  failed: number
  lastSyncAt: Date | null
  isOnline: boolean
  isLoading: boolean
  refresh: () => Promise<void>
}

export function useSyncStatus(): SyncStatusInfo {
  const [status, setStatus] = useState<SyncStatus | null>(null)
  const [isOnline, setIsOnline] = useState(true)
  const [isLoading, setIsLoading] = useState(false)

  const load = useCallback(async () => {
    try {
      const s = await getSyncStatus()
      setStatus(s)
      setIsOnline(s.isOnline)
    } catch {
      // non-fatal
    }
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, REFRESH_INTERVAL_MS)

    const netSub = NetInfo.addEventListener(state => {
      setIsOnline(!!(state.isConnected && state.isInternetReachable !== false))
    })

    return () => {
      clearInterval(interval)
      netSub()
    }
  }, [load])

  return {
    pending: status?.pending ?? 0,
    failed: status?.failed ?? 0,
    lastSyncAt: status?.lastSyncAt ?? null,
    isOnline,
    isLoading,
    refresh: load,
  }
}
