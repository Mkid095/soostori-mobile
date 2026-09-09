// join-shop-sheet.tsx — Enter server IP + request device pairing with host
import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, Modal, ActivityIndicator } from 'react-native'
import { Wifi, CheckCircle2, XCircle } from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import { lanClient } from '../../services/lan-client'

type Step = 'ip_entry' | 'waiting' | 'success' | 'error'

interface Props {
  visible: boolean
  onClose: () => void
  onSuccess: () => void
}

export function JoinShopSheet({ visible, onClose, onSuccess }: Props) {
  const { bg, card, text, textSecondary, border, brand, danger } = useTheme()

  const [serverIp, setServerIp] = useState('')
  const [deviceName, setDeviceName] = useState('')
  const [step, setStep] = useState<Step>('ip_entry')
  const [errorMsg, setErrorMsg] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleConnect() {
    if (!serverIp.trim()) return
    setLoading(true)
    setErrorMsg('')
    setStep('waiting')
    try {
      // First verify the server is reachable
      const resp = await fetch(`http://${serverIp.trim()}:18792/api/ping`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      })
      if (!resp.ok) throw new Error(`Server returned ${resp.status}`)

      // Attempt pairing
      const deviceId = lanClient.getDeviceId() ?? 'mobile-device'
      const pairResp = await fetch(`http://${serverIp.trim()}:18792/api/pair`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId,
          deviceName: deviceName.trim() || 'Mobile Device',
          deviceType: 'mobile',
        }),
        signal: AbortSignal.timeout(10000),
      })

      if (!pairResp.ok) {
        const body = await pairResp.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? `Pairing rejected (${pairResp.status})`)
      }

      await lanClient.storeServerIp(serverIp.trim())
      setStep('success')
      setTimeout(() => { onSuccess() }, 1200)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Connection failed')
      setStep('error')
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setStep('ip_entry')
    setServerIp('')
    setDeviceName('')
    setErrorMsg('')
    onClose()
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <View style={{ flex: 1, backgroundColor: bg }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: border }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: text }}>Join Shop</Text>
          <TouchableOpacity onPress={handleClose}>
            <Text style={{ color: brand, fontWeight: '700', fontSize: 15 }}>Cancel</Text>
          </TouchableOpacity>
        </View>

        <View style={{ padding: 24, gap: 20 }}>
          {/* IP Entry step */}
          {step === 'ip_entry' && (
            <>
              <View style={{ alignItems: 'center', marginBottom: 8 }}>
                <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: brand + '20', justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
                  <Wifi size={28} color={brand} />
                </View>
                <Text style={{ fontSize: 15, color: textSecondary, textAlign: 'center' }}>
                  Enter the shop computer's IP address to connect
                </Text>
              </View>

              <View>
                <Text style={{ fontSize: 13, fontWeight: '600', color: textSecondary, marginBottom: 6, textTransform: 'uppercase' }}>Server IP Address</Text>
                <TextInput
                  style={{
                    backgroundColor: card, borderWidth: 1, borderColor: border,
                    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
                    fontSize: 16, color: text,
                  }}
                  placeholder="192.168.1.100"
                  placeholderTextColor={textSecondary}
                  value={serverIp}
                  onChangeText={setServerIp}
                  keyboardType="numbers-and-punctuation"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View>
                <Text style={{ fontSize: 13, fontWeight: '600', color: textSecondary, marginBottom: 6, textTransform: 'uppercase' }}>Device Name (optional)</Text>
                <TextInput
                  style={{
                    backgroundColor: card, borderWidth: 1, borderColor: border,
                    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
                    fontSize: 16, color: text,
                  }}
                  placeholder="My Phone"
                  placeholderTextColor={textSecondary}
                  value={deviceName}
                  onChangeText={setDeviceName}
                />
              </View>

              <TouchableOpacity
                style={{ backgroundColor: serverIp.trim() ? brand : textSecondary, paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 }}
                onPress={handleConnect}
                disabled={!serverIp.trim() || loading}
              >
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>Connect</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Waiting step */}
          {step === 'waiting' && (
            <View style={{ alignItems: 'center', paddingTop: 40, gap: 16 }}>
              <ActivityIndicator size="large" color={brand} />
              <Text style={{ fontSize: 16, fontWeight: '700', color: text }}>Waiting for approval…</Text>
              <Text style={{ fontSize: 14, color: textSecondary, textAlign: 'center' }}>
                Ask the shop owner or manager to approve this device in their POS system
              </Text>
            </View>
          )}

          {/* Success step */}
          {step === 'success' && (
            <View style={{ alignItems: 'center', paddingTop: 40, gap: 16 }}>
              <CheckCircle2 size={56} color="#16a34a" />
              <Text style={{ fontSize: 18, fontWeight: '800', color: text }}>Connected!</Text>
              <Text style={{ fontSize: 14, color: textSecondary, textAlign: 'center' }}>
                Device paired successfully
              </Text>
            </View>
          )}

          {/* Error step */}
          {step === 'error' && (
            <View style={{ alignItems: 'center', paddingTop: 40, gap: 16 }}>
              <XCircle size={56} color={danger} />
              <Text style={{ fontSize: 18, fontWeight: '800', color: text }}>Connection Failed</Text>
              <Text style={{ fontSize: 14, color: danger, textAlign: 'center' }}>{errorMsg}</Text>
              <TouchableOpacity
                style={{ backgroundColor: brand, paddingVertical: 14, borderRadius: 12, paddingHorizontal: 32 }}
                onPress={() => setStep('ip_entry')}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>Try Again</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  )
}
