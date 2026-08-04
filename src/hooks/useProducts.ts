// React Query hooks for products.
// Wraps the db-products service so screens never call the database directly.

import { useQuery } from '@tanstack/react-query'
import { getAllProducts, searchProducts } from '../services/db-products'
import type { Product } from '../lib/types'

export function useProducts(search?: string) {
  const trimmed = search?.trim() ?? ''
  return useQuery<Product[]>({
    queryKey: trimmed ? ['products', 'search', trimmed] : ['products', 'all'],
    queryFn: () => (trimmed ? searchProducts(trimmed) : getAllProducts()),
  })
}
