// lan-client-handlers.ts — Event handlers for LAN client
import type { SyncEvent } from '../lib/sync-protocol'
import type { LanClientConfig } from './lan-client-types'
import { applySaleConfirmed, applySaleRejected, applyStockUpdated, applySaleReconciliationRequired } from './lan-client-messages'

export type EventHandler = (event: SyncEvent) => Promise<void>

export interface HandlerDeps {
  config: LanClientConfig
  eventHandlers: EventHandler[]
  heartbeat: { current: string | null }
}

export function createHandleEvent(handlers: HandlerDeps) {
  return async function handleEvent(event: SyncEvent): Promise<void> {
    const payload = JSON.parse(event.payload)
    const { config } = handlers

    switch (event.eventType) {
      case 'HOST_HEARTBEAT':
        handlers.heartbeat.current = (payload as { timestamp: string }).timestamp
        config.onHeartbeat?.(handlers.heartbeat.current)
        break
      case 'SALE_CONFIRMED':
        await applySaleConfirmed(payload as import('../lib/sync-protocol').SaleConfirmedPayload)
        config.onSaleConfirmed?.(payload as import('../lib/sync-protocol').SaleConfirmedPayload)
        break
      case 'SALE_REJECTED':
        await applySaleRejected(payload as import('../lib/sync-protocol').SaleRejectedPayload)
        config.onSaleRejected?.(payload as import('../lib/sync-protocol').SaleRejectedPayload)
        break
      case 'STOCK_UPDATED':
        await applyStockUpdated(payload as import('../lib/sync-protocol').StockUpdatedPayload)
        config.onStockUpdated?.(payload as import('../lib/sync-protocol').StockUpdatedPayload)
        break
      case 'DEVICE_PAIRED':
        config.onDevicePaired?.(event.deviceId)
        break
      case 'SALE_RECONCILIATION_REQUIRED':
        await applySaleReconciliationRequired(payload as import('../lib/sync-protocol').SaleReconciliationRequiredPayload)
        config.onReconciliationRequired?.(payload as import('../lib/sync-protocol').SaleReconciliationRequiredPayload)
        break
    }

    for (const handler of handlers.eventHandlers) {
      await handler(event)
    }
  }
}
