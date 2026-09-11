// types-pos.ts — POS domain types (products, sales, cart, stock, expenses)

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
  status: 'pending' | 'pending_offline' | 'completed' | 'cancelled' | 'refunded'
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

export interface ExpenseCategory {
  id: string
  name: string
  color: string
  icon: string
  isActive: boolean
  createdAt: string
}

export interface Expense {
  id: string
  categoryId?: string
  categoryName?: string
  categoryColor?: string
  amount: number
  description?: string
  reference?: string
  date: string
  status: 'pending' | 'approved' | 'paid'
  paidAt?: string
  vendor?: string
  createdBy?: string
  createdAt: string
  updatedAt: string
}
