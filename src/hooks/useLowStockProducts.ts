// useLowStockProducts — low-stock product list state
import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { Product } from '../lib/types'
import { getLowStockProducts, adjustStock } from '../services/db-products'

export function useLowStockProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [refreshing, setRefreshing] = useState(false)

  const { data, refetch, isLoading } = useQuery({
    queryKey: ['products', 'low-stock'],
    queryFn: getLowStockProducts,
  })

  const load = useCallback(async () => {
    setRefreshing(true)
    try {
      const result = await refetch()
      if (result.data) setProducts(result.data)
    } finally {
      setRefreshing(false)
    }
  }, [refetch])

  const handleRestock = useCallback(async (productId: string, qty: number) => {
    await adjustStock(productId, qty, 'Restock')
    await load()
  }, [load])

  return {
    products: data ?? products,
    isLoading,
    refreshing,
    load,
    handleRestock,
  }
}
