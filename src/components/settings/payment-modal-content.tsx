// PaymentModalContent — loads shop settings and renders payment channels
import { useState, useEffect } from 'react'
import { View, Text } from 'react-native'
import { useTheme } from '../../hooks/useTheme'
import { PaymentChannelsSection } from './payment-channels-section'
import { getShopSettings } from '../../services/db-settings'
import type { ShopSettings } from '../../lib/types'

export function PaymentModalContent() {
  const { text, textSecondary } = useTheme()
  const [settings, setSettings] = useState<ShopSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    getShopSettings()
      .then(s => { setSettings(s); setLoading(false) })
      .catch(e => { setError(String(e)); setLoading(false) })
  }, [])

  if (loading) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 40 }}>
        <Text style={{ color: textSecondary, fontSize: 14 }}>Loading…</Text>
      </View>
    )
  }
  if (error || !settings) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 40 }}>
        <Text style={{ color: '#ef4444', fontSize: 13, textAlign: 'center', paddingHorizontal: 20 }}>
          Could not load payment settings.{'\n'}{error}
        </Text>
      </View>
    )
  }
  return <PaymentChannelsSection settings={settings} />
}
