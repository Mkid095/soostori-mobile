// types-inventory.ts — Inventory domain types (customers, debts, variants, notifications)

export interface Customer {
  id: string
  name: string
  phone?: string
  idNumber?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// Client is an alias for Customer (used in client service context)
export interface Client {
  id: string
  name: string
  phone?: string
  idNumber?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Debt {
  id: string
  customerId?: string
  customerName?: string
  customerPhone?: string
  saleId?: string
  amount: number
  amountPaid: number
  status: 'pending' | 'partial' | 'paid'
  dueDate?: string
  notes?: string
  createdAt: string
  updatedAt: string
  payments?: DebtPayment[]
}

export interface DebtPayment {
  id: string
  debtId: string
  amount: number
  paymentMethod: string
  reference?: string
  notes?: string
  createdAt: string
}

export interface PaymentChannels {
  cash: boolean
  mpesaSend: boolean
  mpesaPaybill: boolean
  bankPaybill: boolean
  pochila: boolean
}

export interface ShopSettings {
  id: string
  name: string
  address?: string
  phone?: string
  currency: string
  receiptFooter?: string
  receiptPrefix?: string
  lowStockThreshold?: number
  mpesaSendMoneyPhone?: string
  mpesaPaybillNumber?: string
  mpesaPaybillAccount?: string
  bankPaybillNumber?: string
  bankPaybillAccount?: string
  mpesaPochiPhone?: string
  enabledPaymentChannels?: PaymentChannels
  biometricEnabled?: boolean
  updatedAt: string
}

export interface ProductVariant {
  id: string
  productId: string
  name: string
  sku?: string
  barcode?: string
  costPrice?: number
  sellingPrice?: number
  stockQuantity: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface AppNotification {
  id: string
  type: 'low_stock' | 'debt_due' | 'sync_complete' | 'system' | 'info'
  title: string
  body?: string
  data?: Record<string, unknown>
  isRead: boolean
  createdAt: string
}
