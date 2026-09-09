// useLanSync — LAN client sync state for mobile
// Mobile CANNOT host — only connects to desktop host via lan-client.ts
import { useEffect, useState, useCallback } from 'react'
import { lanClient } from '../services/lan-client'
import type { SaleConfirmedPayload, SaleRejectedPayload, StockUpdatedPayload, SaleReconciliationRequiredPayload } from '../lib/sync-protocol'

const HEARTBEAT_TIMEOUT_MS = 30_000 // 30 seconds without heartbeat = host unavailable

interface UseLanSyncOptions {
  shopId: string
  deviceId: string
  onSaleConfirmed?: (payload: SaleConfirmedPayload) => void
  onSaleRejected?: (payload: SaleRejectedPayload) => void
  onStockUpdated?: (payload: StockUpdatedPayload) => void
  onDevicePaired?: (deviceId: string) => void
  onConnectionChange?: (state: 'disconnected' | 'connecting' | 'connected' | 'reconnecting') => void
  onHeartbeat?: (timestamp: string) => void
  onReconciliationRequired?: (payload: SaleReconciliationRequiredPayload) => void
}

export function useLanSync(options: UseLanSyncOptions) {
  const { onSaleConfirmed, onSaleRejected, onStockUpdated, onDevicePaired, onConnectionChange, onHeartbeat, onReconciliationRequired } = options
  const [isConnected, setIsConnected] = useState(false)
  const [isHostAvailable, setIsHostAvailable] = useState(false)
  const [lastHeartbeat, setLastHeartbeat] = useState<string | null>(null)
  const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected' | 'reconnecting'>('disconnected')

  useEffect(() => {
    let heartbeatTimer: ReturnType<typeof setInterval> | null = null

    const checkHostAvailable = () => {
      if (!lastHeartbeat) {
        setIsHostAvailable(isConnected)
        return
      }
      const elapsed = Date.now() - new Date(lastHeartbeat).getTime()
      setIsHostAvailable(elapsed < HEARTBEAT_TIMEOUT_MS)
    }

    heartbeatTimer = setInterval(checkHostAvailable, 5_000)

    return () => {
      if (heartbeatTimer) clearInterval(heartbeatTimer)
    }
  }, [lastHeartbeat, isConnected])

  useEffect(() => {
    lanClient.configure({
      onSaleConfirmed,
      onSaleRejected,
      onStockUpdated,
      onDevicePaired,
      onHeartbeat: (ts) => {
        setLastHeartbeat(ts)
        onHeartbeat?.(ts)
      },
      onReconciliationRequired,
      onConnectionChange: (state) => {
        setConnectionState(state)
        setIsConnected(state === 'connected')
        if (state !== 'connected') setIsHostAvailable(false)
        onConnectionChange?.(state)
      },
    })
  }, [onSaleConfirmed, onSaleRejected, onStockUpdated, onDevicePaired, onConnectionChange, onHeartbeat, onReconciliationRequired])

  const connect = useCallback(async () => {
    setConnectionState('connecting')
    try {
      await lanClient.connect()
      setIsConnected(true)
    } catch {
      setIsConnected(false)
      setIsHostAvailable(false)
    }
  }, [])

  const disconnect = useCallback(() => {
    lanClient.disconnect()
    setIsConnected(false)
    setIsHostAvailable(false)
    setConnectionState('disconnected')
  }, [])

  return {
    isConnected,
    isHostAvailable,
    lastHeartbeat,
    connectionState,
    connect,
    disconnect,
    lanClient,
  }
}
