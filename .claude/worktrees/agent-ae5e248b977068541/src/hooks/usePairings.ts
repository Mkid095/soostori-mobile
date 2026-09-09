// usePairings — pending pairing requests for current shop
import { useEffect, useState } from 'react'
import { getPendingPairings, approvePairing, rejectPairing, createPairing } from '../services/db-pairings'
import { getDeviceById } from '../services/db-devices'
import type { DevicePairing, Device } from '../lib/sync-protocol'

interface PairingWithDevice extends DevicePairing {
  device: Device | null
}

export function usePairings(shopId: string) {
  const [pairings, setPairings] = useState<PairingWithDevice[]>([])
  const [isLoading, setIsLoading] = useState(false)

  async function refresh() {
    if (!shopId) return
    setIsLoading(true)
    try {
      const pending = await getPendingPairings(shopId)
      const withDevices = await Promise.all(
        pending.map(async p => ({
          ...p,
          device: await getDeviceById(p.deviceId),
        }))
      )
      setPairings(withDevices)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { refresh() }, [shopId])

  async function approve(pairingId: string, approvedBy: string): Promise<void> {
    await approvePairing(pairingId, approvedBy)
    await refresh()
  }

  async function reject(pairingId: string): Promise<void> {
    await rejectPairing(pairingId)
    await refresh()
  }

  async function request(deviceId: string, shopId: string, requestedBy?: string): Promise<DevicePairing> {
    const p = await createPairing(shopId, deviceId, requestedBy)
    await refresh()
    return p
  }

  return { pairings, isLoading, refresh, approve, reject, request }
}
