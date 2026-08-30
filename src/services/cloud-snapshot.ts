// Cloud snapshot API — full shop data for device recovery
// Phase 4 — Device Recovery

export async function cloudDownloadSnapshot(shopId: string): Promise<Record<string, unknown>> {
  throw new Error('Cloud API not yet defined — pending sync-contract.md')
}

export async function cloudUploadSnapshot(shopId: string, snapshot: Record<string, unknown>): Promise<void> {
  throw new Error('Cloud API not yet defined — pending sync-contract.md')
}

export async function cloudRequestDeviceRecovery(email: string, phone: string): Promise<{ verified: boolean }> {
  throw new Error('Cloud API not yet defined — pending sync-contract.md')
}
