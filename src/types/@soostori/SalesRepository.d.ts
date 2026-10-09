// Type declarations for @soostori/sales module
export interface Sale {
  id: string
  shopId: string
  employeeId: string
  deviceId: string
  totalAmount: number
  paymentMethod: string
  status: string
  createdAt: string
  updatedAt: string
}

export interface SaleItem {
  id: string
  saleId: string
  productId?: string
  productName: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

export interface SaleFilter {
  shopId?: string
  status?: string
  from?: string
  to?: string
}

export interface PaginationOptions {
  limit?: number
  offset?: number
}

export interface SalesTotals {
  totalAmount: number
  count: number
  total?: number
  byPaymentMethod?: Record<string, number>
}

export interface HeldSale {
  id: string
  shopId: string
  employeeId: string
  items: SaleItem[]
  totalAmount: number
  createdAt: string
}

export interface SalesRepository {
  findById(id: string): Promise<Sale | null>
  findMany(filter?: SaleFilter, pagination?: PaginationOptions): Promise<Sale[]>
  totals(filter?: SaleFilter): Promise<SalesTotals>
  findHeldSales(shopId: string): Promise<HeldSale[]>
  create(sale: Sale, items: SaleItem[]): Promise<Sale>
  update(id: string, changes: Partial<Sale>): Promise<Sale>
  createHeldSale(data: Omit<HeldSale, 'id' | 'createdAt'>): Promise<HeldSale>
  deleteHeldSale(id: string): Promise<void>
  findItemsBySaleId(saleId: string): Promise<SaleItem[]>
}
