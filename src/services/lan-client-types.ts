// lan-client-types.ts — Types for LAN client
import type {
  SalePendingPayload,
  SaleConfirmedPayload,
  SaleRejectedPayload,
  StockUpdatedPayload,
  SaleReconciliationRequiredPayload,
} from '../lib/sync-protocol'

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting'
export type EventHandler = (event: import('../lib/sync-protocol').SyncEvent) => Promise<void>

export interface LanClientConfig {
  onSalePending?: (payload: SalePendingPayload) => void
  onSaleConfirmed?: (payload: SaleConfirmedPayload) => void
  onSaleRejected?: (payload: SaleRejectedPayload) => void
  onStockUpdated?: (payload: StockUpdatedPayload) => void
  onDevicePaired?: (deviceId: string) => void
  onConnectionChange?: (state: ConnectionState) => void
  onHeartbeat?: (timestamp: string) => void
  onReconciliationRequired?: (payload: SaleReconciliationRequiredPayload) => void
}
