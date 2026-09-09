// Shared React Query client — created once on first import.
// All hooks in src/hooks/ use this same instance.
import { QueryClient } from '@tanstack/react-query'

let client: QueryClient | null = null

export function getQueryClient(): QueryClient {
  if (client) return client
  client = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  })
  return client
}
