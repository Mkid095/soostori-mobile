// src/lib/sync-protocol.ts
// SHARED between desktop and mobile — both apps import from here
// DO NOT duplicate event types in other files

export type SyncEventType =
  | 'SALE_PENDING'
  | 'SALE_CONFIRMED'
  | 'SALE_REJECTED'
  | 'SALE_RECONCILIATION_REQUIRED'
  | 'STOCK_UPDATED'
  | 'PRODUCT_CREATED'
  | 'PRODUCT_UPDATED'
  | 'PRODUCT_DELETED'
  | 'DEVICE_PAIRED'
  | 'DEVICE_DISCONNECTED'
  | 'HOST_TRANSFER'

export type SaleStatus = 'pending' | 'pending_offline' | 'confirmed' | 'rejected' | 'cancelled'
export type PairingStatus = 'pending' | 'approved' | 'rejected'
export type EmployeeRole = 'owner' | 'manager' | 'attendant'
export type DeviceType = 'desktop' | 'mobile' | 'tablet'
export type InventoryTransactionType = 'SALE' | 'PURCHASE' | 'ADJUSTMENT' | 'SALE_CANCELLED'

export interface Shop {
  id: string; name: string; createdAt: string
}

export interface Employee {
  id: string; shopId: string; name: string
  email?: string; phone?: string
  pinHash: string; pinSalt: string
  role: EmployeeRole; isActive: boolean
  createdAt: string; updatedAt: string
}

export interface Invitation {
  id: string; shopId: string; employeeId: string; code: string
  expiresAt: string; usedAt?: string; createdAt: string
}

export interface Device {
  id: string; shopId: string; employeeId?: string
  deviceName?: string; deviceType: DeviceType
  isHost: boolean; lastSeen?: string
  capabilities?: string // JSON string
  createdAt: string
}

export interface DevicePairing {
  id: string; shopId: string; deviceId: string
  requestedBy?: string; approvedBy?: string
  approvedAt?: string; status: PairingStatus; createdAt: string
}

export interface SyncEvent {
  id: string; shopId: string; deviceId: string
  sequenceNumber: number
  eventType: SyncEventType; payload: string
  timestamp: string
}

export interface InventoryTransaction {
  id: string; shopId: string; productId: string; variantName?: string
  type: InventoryTransactionType; quantity: number; balanceAfter: number
  createdBy?: string; deviceId?: string; referenceId?: string
  reason?: string; timestamp: string
}

export interface Sale {
  id: string; shopId: string; employeeId: string; deviceId: string
  status: SaleStatus; paymentMethod?: string
  subtotal: number; discountAmount: number; totalAmount: number
  customerIdNumber?: string; note?: string
  createdAt: string; updatedAt: string
}

export interface SaleItem {
  id: string; saleId: string; productId: string; variationName?: string
  productName: string; quantity: number; unitPrice: number
  discount: number; totalPrice: number
}

export interface AuditLog {
  id: string; shopId: string; employeeId?: string; deviceId?: string
  action: string; entityType: string; entityId: string
  oldValue?: string; newValue?: string; reason?: string; timestamp: string
}

// Sync payload types
export interface SalePendingPayload {
  type: 'SALE_PENDING'; saleId: string
  items: Array<{ productId: string; variantName?: string; quantity: number; unitPrice: number; totalPrice: number }>
  totalAmount: number; paymentMethod: string
  employeeId: string; deviceId: string; timestamp: string
}

export interface SaleConfirmedPayload {
  type: 'SALE_CONFIRMED'; saleId: string
  items: Array<{ productId: string; variantName?: string; quantity: number }>
  totalAmount: number; paymentMethod: string; timestamp: string
}

export interface SaleRejectedPayload {
  type: 'SALE_REJECTED'; saleId: string; reason: string; timestamp: string
}

export interface StockUpdatedPayload {
  type: 'STOCK_UPDATED'; productId: string; variantName?: string
  delta: number; newBalance: number; timestamp: string
}

export type SyncPayload =
  | SalePendingPayload | SaleConfirmedPayload | SaleRejectedPayload | StockUpdatedPayload
