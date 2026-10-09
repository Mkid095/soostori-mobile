// Type declarations for @soostori/customers module
export interface Customer {
  id: string
  name: string
  phone?: string
  email?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type CustomerRiskFlag = 'low' | 'medium' | 'high'

export interface CustomerFilter {
  search?: string
  isActive?: boolean
}

export interface PaginationOptions {
  limit?: number
  offset?: number
}

export interface CustomersRepository {
  findById(id: string): Promise<Customer | null>
  findMany(filter?: CustomerFilter, pagination?: PaginationOptions): Promise<Customer[]>
}
