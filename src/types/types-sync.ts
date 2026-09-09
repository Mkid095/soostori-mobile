// types-sync.ts — Sync and queue types
// Re-exported from sync-protocol (shared contract with desktop)

export type {
  Shop,
  Employee,
  Invitation,
  Device,
  DevicePairing,
  SyncEvent,
  InventoryTransaction,
  AuditLog,
  EmployeeRole,
  DeviceType,
  SaleStatus,
  PairingStatus,
  InventoryTransactionType,
  SyncEventType,
  SyncConflict,
  Sale,
  SaleItem,
  SalePendingPayload,
  SaleConfirmedPayload,
  SaleRejectedPayload,
  SaleReconciliationRequiredPayload,
  StockUpdatedPayload,
  SyncPayload,
} from '../lib/sync-protocol'

export interface SyncQueueItem {
  id: string
  tableName: string
  action: 'create' | 'update' | 'delete'
  payload: string
  status: 'pending' | 'synced' | 'failed'
  createdAt: number
  syncedAt?: number
}
