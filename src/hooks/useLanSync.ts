// useLanSync — LAN client sync state for mobile
// Mobile CANNOT host — only connects to desktop host via lan-client.ts
import { useEffect, useState, useCallback } from 'react'
import { lanClient } from '../services/lan-client'
import type { SyncEvent, SaleConfirmedPayload, SaleRejectedPayload, StockUpdatedPayload } from '../lib/sync-protocol'

interface UseLanSyncOptions {
  shopId: string
  deviceId: string
  onSaleConfirmed?: (payload: SaleConfirmedPayload) => void
  onSaleRejected?: (payload: SaleRejectedPayload) => void
  onStockUpdated?: (payload: StockUpdatedPayload) => void
  onDevicePaired?: (deviceId: string) => void
  onConnectionChange?: (state: 'disconnected' | 'connecting' | 'connected' | 'reconnecting') => void
}

export function useLanSync(options: UseLanSyncOptions) {
  const { onSaleConfirmed, onSaleRejected, onStockUpdated, onDevicePaired, onConnectionChange } = options
  const [isConnected, setIsConnected] = useState(false)
  const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected' | 'reconnecting'>('disconnected')

  useEffect(() => {
    lanClient.configure({
      onSaleConfirmed,
      onSaleRejected,
      onStockUpdated,
      onDevicePaired,
      onConnectionChange: (state) => {
        setConnectionState(state)
        setIsConnected(state === 'connected')
        onConnectionChange?.(state)
      },
    })
  }, [onSaleConfirmed, onSaleRejected, onStockUpdated, onDevicePaired, onConnectionChange])

  const connect = useCallback(async () => {
    setConnectionState('connecting')
    try {
      await lanClient.connect()
      setIsConnected(true)
    } catch {
      setIsConnected(false)
    }
  }, [])

  const disconnect = useCallback(() => {
    lanClient.disconnect()
    setIsConnected(false)
    setConnectionState('disconnected')
  }, [])

  return {
    isConnected,
    connectionState,
    connect,
    disconnect,
    lanClient,
  }
}
