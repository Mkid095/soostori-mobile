// PaymentPaybillField — paybill number + account input
import { View, Text, TextInput } from 'react-native'
import { useTheme } from '../../hooks/useTheme'

interface Props {
  label: string
  paybillNum: string
  account: string
  onPaybillChange: (v: string) => void
  onAccountChange: (v: string) => void
}

export function PaymentPaybillField({ label, paybillNum, account, onPaybillChange, onAccountChange }: Props) {
  const { card, text, textSecondary: textMuted, border } = useTheme()
  const inputStyle = { backgroundColor: card, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: text, borderWidth: 1, borderColor: border }
  return (
    <View style={{ backgroundColor: card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: border }}>
      <Text style={{ fontSize: 13, fontWeight: '700', color: textMuted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </Text>
      <TextInput
        style={{ ...inputStyle, marginBottom: 12 }}
        value={paybillNum}
        onChangeText={onPaybillChange}
        placeholder="Paybill number"
        placeholderTextColor={textMuted}
        keyboardType="number-pad"
      />
      <Text style={{ fontSize: 13, fontWeight: '700', color: textMuted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        Account Number
      </Text>
      <TextInput
        style={inputStyle}
        value={account}
        onChangeText={onAccountChange}
        placeholder="Account number"
        placeholderTextColor={textMuted}
      />
    </View>
  )
}
