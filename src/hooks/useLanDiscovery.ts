// useLanDiscovery.ts — LAN server discovery and pairing hook
import { useState } from 'react'
import { lanClient } from '../services/lan-client'
import { pingLanServer, requestLanPairing } from './lan-discovery-http'

type Step = 'ip_entry' | 'waiting' | 'success' | 'error'

export function useLanDiscovery() {
  const [serverIp, setServerIp] = useState('')
  const [deviceName, setDeviceName] = useState('')
  const [step, setStep] = useState<Step>('ip_entry')
  const [errorMsg, setErrorMsg] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleConnect(): Promise<boolean> {
    const ip = serverIp.trim()
    if (!ip) {
      setErrorMsg('Enter the desktop host IP address.')
      setStep('error')
      return false
    }
    setLoading(true)
    setErrorMsg('')
    setStep('waiting')
    try {
      await pingLanServer(ip)
      const deviceId = lanClient.getDeviceId() ?? 'mobile-device'
      await requestLanPairing({ serverIp: ip, deviceId, deviceName: deviceName.trim() || 'Mobile Device' })
      await lanClient.storeServerIp(ip)
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