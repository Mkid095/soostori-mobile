// types.ts — Re-export barrel for all domain types
// Split into: types-pos.ts, types-sync.ts, types-employee.ts, types-device.ts, types-inventory.ts

// POS types
export type {
  Product,
  GroupPrice,
  Category,
  Sale,
  SaleItem,
  CartItem,
  HeldSale,
  StockMovement,
  ExpenseCategory,
  Expense,
} from './types-pos'

// Sync types (includes Shop, Employee, Device, DevicePairing, etc.)
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
  Sale as CloudSale,
  SaleItem as CloudSaleItem,
  SalePendingPayload,
  SaleConfirmedPayload,
  SaleRejectedPayload,
  SaleReconciliationRequiredPayload,
  StockUpdatedPayload,
  SyncPayload,
  SyncQueueItem,
} from './types-sync'

// Inventory types
export type {
  Customer,
  Client,
  Debt,
  DebtPayment,
  PaymentChannels,
  ShopSettings,
  ProductVariant,
  AppNotification,
} from './types-inventory'
