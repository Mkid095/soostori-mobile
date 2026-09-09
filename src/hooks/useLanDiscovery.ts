// useLanDiscovery.ts — LAN server discovery and pairing hook
import { useState } from 'react'
import { lanClient } from '../services/lan-client'

type Step = 'ip_entry' | 'waiting' | 'success' | 'error'

export function useLanDiscovery() {
  const [serverIp, setServerIp] = useState('')
  const [deviceName, setDeviceName] = useState('')
  const [step, setStep] = useState<Step>('ip_entry')
  const [errorMsg, setErrorMsg] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleConnect(): Promise<boolean> {
    if (!serverIp.trim()) return false
    setLoading(true)
    setErrorMsg('')
    setStep('waiting')
    try {
      const resp = await fetch(`http://${serverIp.trim()}:18792/api/ping`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      })
      if (!resp.ok) throw new Error(`Server returned ${resp.status}`)

      const deviceId = lanClient.getDeviceId() ?? 'mobile-device'
      const pairResp = await fetch(`http://${serverIp.trim()}:18792/api/pair`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, deviceName: deviceName.trim() || 'Mobile Device', deviceType: 'mobile' }),
        signal: AbortSignal.timeout(10000),
      })

      if (!pairResp.ok) {
        const body = await pairResp.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? `Pairing rejected (${pairResp.status})`)
      }

      await lanClient.storeServerIp(serverIp.trim())
      setStep('success')
      return true
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Connection failed')
      setStep('error')
      return false
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setStep('ip_entry')
    setServerIp('')
    setDeviceName('')
    setErrorMsg('')
  }

  return { serverIp, setServerIp, deviceName, setDeviceName, step, setStep, errorMsg, loading, handleConnect, reset }
}
