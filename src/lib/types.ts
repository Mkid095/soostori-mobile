// Soostori Mobile — Core Types
// Mirrors soostori-desktop/src/lib/types.ts for offline-first SQLite

export interface Product {
  id: string
  categoryId?: string
  categoryName?: string
  categoryColor?: string
  name: string
  sku?: string
  barcode?: string
  imageUrl?: string
  costPrice: number
  sellingPrice: number
  discountPrice?: number
  unit: string
  stockQuantity: number
  lowStockThreshold: number
  trackInventory: boolean
  allowSingleUnitSale: boolean
  distributorName?: string
  distributorPhone?: string
  unitsPerPackage?: number
  boxBuyingPrice?: number
  groupPrices?: GroupPrice[]
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface GroupPrice {
  name: string
  price: number
  minQuantity: number
}

export interface Category {
  id: string
  name: string
  color: string
  description?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Sale {
  id: string
  type: 'retail' | 'wholesale' | 'order'
  status: 'pending' | 'completed' | 'cancelled' | 'refunded'
  subtotal: number
  discountAmount: number
  totalAmount: number
  paidAmount: number
  paymentMethod: 'cash' | 'card' | 'transfer' | 'mobile_money' | 'mpesa' | 'debt'
  note?: string
  customerIdNumber?: string
  createdAt: string
  updatedAt: string
  items?: SaleItem[]
  items_summary?: string
}

export interface SaleItem {
  id: string
  saleId: string
  productId?: string
  variationName?: string
  productName: string
  quantity: number
  unitPrice: number
  discount: number
  totalPrice: number
}

export interface CartItem {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  totalPrice: number
  discount: number
  variationName?: string
}

export interface HeldSale {
  id: string
  name?: string
  cartItems: CartItem[]
  paymentMethod: string
  createdAt: string
}

export interface StockMovement {
  id: string
  productId: string
  productName?: string
  type: 'adjustment' | 'sale' | 'purchase' | 'return'
  quantity: number
  balanceAfter: number
  reason?: string
  referenceId?: string
  createdAt: string
}

export interface Customer {
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
  enabledPaymentChannels?: PaymentChannels
  biometricEnabled?: boolean
  updatedAt: string
}

export interface SyncQueueItem {
  id: string
  tableName: string
  action: 'create' | 'update' | 'delete'
  payload: string
  status: 'pending' | 'synced' | 'failed'
  createdAt: number
  syncedAt?: number
}
