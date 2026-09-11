// useProducts.ts — React Query hooks for products.
// Wraps the db-products service so screens never call the database directly.

import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getAllProducts, searchProducts, getLowStockProducts } from '../services/db-products'
import type { Product } from '../lib/types'

export function useProducts(search?: string) {
  const trimmed = search?.trim() ?? ''
  return useQuery<Product[]>({
    queryKey: trimmed ? ['products', 'search', trimmed] : ['products', 'all'],
    queryFn: () => (trimmed ? searchProducts(trimmed) : getAllProducts()),
  })
}

export function useLowStockHook() {
  return useQuery<Product[]>({
    queryKey: ['products', 'low-stock'],
    queryFn: getLowStockProducts,
  })
}

export function useProductsRefresh() {
  const qc = useQueryClient()
  return useCallback(() => {
    qc.invalidateQueries({ queryKey: ['products'] })
  }, [qc])
}
