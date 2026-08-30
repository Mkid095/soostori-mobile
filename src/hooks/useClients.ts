// React Query hooks for clients.
// Wraps the db-clients service so screens never call the database directly.

import { useQuery } from '@tanstack/react-query'
import { getClients, searchClients, getClientPurchaseHistory } from '../services/db-clients'

export function useClients(search?: string) {
  const trimmed = search?.trim() ?? ''
  return useQuery<import('../lib/types').Client[]>({
    queryKey: trimmed ? ['clients', 'search', trimmed] : ['clients', 'all'],
    queryFn: () => (trimmed ? searchClients(trimmed) : getClients()),
  })
}

export function useClientPurchaseHistory(customerIdNumber: string | undefined) {
  return useQuery<import('../lib/types').Sale[]>({
    queryKey: ['clients', 'purchase-history', customerIdNumber],
    queryFn: () => getClientPurchaseHistory(customerIdNumber!),
    enabled: Boolean(customerIdNumber),
  })
}
