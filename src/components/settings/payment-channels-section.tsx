// PaymentChannelsSection — payment method toggles
// Pure presentation: no business logic.

import { View, Text, Switch } from 'react-native'
import { useTheme } from '../../hooks/useTheme'

interface PaymentChannels {
  cash: boolean
  mpesaSend: boolean
  mpesaPaybill: boolean
  bankPaybill: boolean
  pochila: boolean
}

interface Props {
  channels: PaymentChannels
  onToggle: (key: keyof PaymentChannels) => void
}

function ChannelToggle({ label, value, onToggle }: { label: string; value: boolean; onToggle: () => void }) {
  const { text, textSecondary: textMuted, border, isDark, brand: orange } = useTheme()
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 }}>
      <Text style={{ fontSize: 14, color: text, fontWeight: '600' }}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: isDark ? '#334155' : '#e2e8f0', true: orange }}
        thumbColor="#fff"
      />
    </View>
  )
}

export function PaymentChannelsSection({ channels, onToggle }: Props) {
  const { card, text, textSecondary: textMuted, border } = useTheme()
  return (
    <View style={{ backgroundColor: card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: border }}>
      <Text style={{ fontSize: 15, fontWeight: '800', color: text, marginBottom: 4 }}>Payment Channels</Text>
      <Text style={{ fontSize: 11, color: textMuted, marginBottom: 12 }}>Enable or disable payment methods shown at checkout</Text>
      <ChannelToggle label="Cash" value={channels.cash} onToggle={() => onToggle('cash')} />
      <View style={{ height: 1, backgroundColor: border }} />
      <ChannelToggle label="M-Pesa Send Money" value={channels.mpesaSend} onToggle={() => onToggle('mpesaSend')} />
      <View style={{ height: 1, backgroundColor: border }} />
      <ChannelToggle label="M-Pesa Paybill" value={channels.mpesaPaybill} onToggle={() => onToggle('mpesaPaybill')} />
      <View style={{ height: 1, backgroundColor: border }} />
      <ChannelToggle label="Bank Paybill" value={channels.bankPaybill} onToggle={() => onToggle('bankPaybill')} />
      <View style={{ height: 1, backgroundColor: border }} />
      <ChannelToggle label="Pochi La Biashara" value={channels.pochila} onToggle={() => onToggle('pochila')} />
    </View>
  )
}
