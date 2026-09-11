// sync-retry-backoff.ts — Phase 16 retry backoff constants and helpers
// Shared by mobile-sync-engine for outbox retry logic

// Exponential backoff: 1min, 5min, 15min (matches brief spec)
export const RETRY_DELAYS_MS = [60_000, 300_000, 900_000]
export const MAX_RETRIES = 3

export function getNextRetryDelay(retryCount: number): number {
  // Clamp to last delay if retries exceed array bounds
  return RETRY_DELAYS_MS[retryCount - 1] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1]
}
