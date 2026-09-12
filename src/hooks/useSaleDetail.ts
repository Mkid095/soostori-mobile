// useSaleDetail.ts — Phase 19: sale detail query hook
import { useQuery } from '@tanstack/react-query'
import { getSaleById } from '../services/db-sales-queries'

export function useSaleDetail(saleId: string) {
  return useQuery({
    queryKey: ['sale', saleId],
    queryFn: () => getSaleById(saleId),
    enabled: !!saleId,
  })
}
