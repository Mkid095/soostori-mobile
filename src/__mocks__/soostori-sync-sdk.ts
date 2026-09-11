// @soostori/sync-sdk — runtime mock for jest (CJS).
// Minimal stub for the sync engine functions used by mobile-sync-service.ts.

export function ensureOutboxTable(_shopId: string): Promise<void> {
  return Promise.resolve()
}

export function enqueue(_shopId: string, _payload: Record<string, unknown>): Promise<void> {
  return Promise.resolve()
}

export function pull(_shopId: string, _lastSyncAt: string | null): Promise<Record<string, unknown>> {
  return Promise.resolve({ changes: [] })
}

export function apply(_shopId: string, _change: Record<string, unknown>): Promise<void> {
  return Promise.resolve()
}

export function pushOutbox(_shopId: string): Promise<void> {
  return Promise.resolve()
}
