import { useQuery } from '@tanstack/react-query'
import { getHeldSales } from '../services/db-sales'

export function useHeldSales() {
  return useQuery({
    queryKey: ['held-sales'],
    queryFn: getHeldSales,
    staleTime: 30_000,
  })
}
