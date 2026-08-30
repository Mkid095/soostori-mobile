// Cloud sync API — uploads/downloads events with Soostori Cloud
// NOTE: This MUST be replaced with real HTTPS calls once sync-contract.md is defined

export async function cloudUploadEvents(events: Array<{
  id: string
  tableName: string
  action: string
  payload: unknown
  timestamp: string
}>): Promise<void> {
  throw new Error('Cloud API not yet defined — pending sync-contract.md from web team')
}

export async function cloudDownloadEvents(sinceSequence: number): Promise<Array<{
  id: string
  sequenceNumber: number
  type: string
  entityId: string
  payload: unknown
  timestamp: string
}>> {
  throw new Error('Cloud API not yet defined — pending sync-contract.md from web team')
}

export async function cloudPing(): Promise<{ ok: boolean; serverTime: string }> {
  throw new Error('Cloud API not yet defined — pending sync-contract.md from web team')
}
