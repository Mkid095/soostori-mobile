// useCustomerDetail.ts — Phase 19: customer detail query hook
import { useQuery } from '@tanstack/react-query'
import { getCustomerDetail } from '../services/customers-service'

export function useCustomerDetail(customerId: string) {
  return useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => getCustomerDetail(customerId),
    enabled: !!customerId,
  })
}
