// useApprovals — approval/conflict state for approvals screen
import { useState, useEffect, useCallback } from 'react'
import type { SyncConflict, SaleReconciliationRequiredPayload } from '../lib/sync-protocol'

interface PendingPairing {
  id: string
  deviceId: string
  deviceName: string
  requestedAt: string
}

export function useApprovals() {
  const [pending, setPending] = useState<PendingPairing[]>([])
  const [conflicts, setConflicts] = useState<SyncConflict[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      // Load pending pairings
      try {
        const { getDb } = await import('../lib/db')
        const db = await getDb()
        const rows = await db.getAllAsync<Record<string, unknown>>(
          `SELECT id, device_id, device_name, created_at FROM device_pairings WHERE status = 'pending' ORDER BY created_at DESC`,
        )
        setPending(rows.map((r) => ({
          id: String(r.id),
          deviceId: String(r.device_id),
          deviceName: String(r.device_name ?? 'Unknown Device'),
          requestedAt: String(r.created_at),
        })))
      } catch { setPending([]) }

      // Load pending conflicts
      try {
        const { getPendingConflicts } = await import('../services/db-conflicts')
        const conflicts = await getPendingConflicts('default')
        setConflicts(conflicts)
      } catch { setConflicts([]) }
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function approvePairing(id: string) {
    const { getDb } = await import('../lib/db')
    const db = await getDb()
    await db.runAsync(`UPDATE device_pairings SET status = 'approved' WHERE id = ?`, [id])
    setPending((prev) => prev.filter((p) => p.id !== id))
  }

  async function rejectPairing(id: string) {
    const { getDb } = await import('../lib/db')
    const db = await getDb()
    await db.runAsync(`UPDATE device_pairings SET status = 'rejected' WHERE id = ?`, [id])
    setPending((prev) => prev.filter((p) => p.id !== id))
  }

  async function resolveConflict(
    conflictId: string,
    resolution: 'PARTIAL_FULFILL' | 'CANCEL',
    partialQuantities?: Record<string, number>,
  ) {
    const { resolveConflict: dbResolve, applyPartialFulfillment } = await import('../services/db-conflicts')
    await dbResolve(conflictId, resolution, 'owner', partialQuantities)
    if (resolution === 'PARTIAL_FULFILL' && partialQuantities) {
      await applyPartialFulfillment(conflictId, partialQuantities)
    }
    setConflicts((prev) => prev.filter((c) => c.id !== conflictId))
  }

  return {
    pending,
    conflicts,
    isLoading,
    load,
    approvePairing,
    rejectPairing,
    resolveConflict,
  }
}
