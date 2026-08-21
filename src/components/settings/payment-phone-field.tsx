// PaymentPhoneField — phone number input for M-Pesa Send Money and Pochi
import { View, Text, TextInput } from 'react-native'
import { useTheme } from '../../hooks/useTheme'

interface Props {
  label: string
  value: string
  onChangeText: (v: string) => void
}

export function PaymentPhoneField({ label, value, onChangeText }: Props) {
  const { card, text, textSecondary: textMuted, border } = useTheme()
  const inputStyle = { backgroundColor: card, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: text, borderWidth: 1, borderColor: border }
  return (
    <View style={{ backgroundColor: card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: border }}>
      <Text style={{ fontSize: 13, fontWeight: '700', color: textMuted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </Text>
      <TextInput
        style={inputStyle}
        value={value}
        onChangeText={onChangeText}
        placeholder="+254 700 000 000"
        placeholderTextColor={textMuted}
        keyboardType="phone-pad"
      />
    </View>
  )
}
