// MpesaConfig — M-Pesa phone, paybill number, account fields
// Pure presentation: no business logic.

import { View, Text, TextInput } from 'react-native'
import { useTheme } from '../../hooks/useTheme'

interface Props {
  mpesaPhone: string
  mpesaPaybillNum: string
  mpesaPaybillAcc: string
  onPhone: (v: string) => void
  onPaybillNum: (v: string) => void
  onPaybillAcc: (v: string) => void
}

export function MpesaConfig({ mpesaPhone, mpesaPaybillNum, mpesaPaybillAcc, onPhone, onPaybillNum, onPaybillAcc }: Props) {
  const { card, text, textSecondary: textMuted, border, bg } = useTheme()
  const inputStyle = { backgroundColor: bg, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: text, borderWidth: 1, borderColor: border }

  return (
    <View style={{ backgroundColor: card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: border }}>
      <Text style={{ fontSize: 15, fontWeight: '800', color: text, marginBottom: 14 }}>M-Pesa Configuration</Text>
      <View style={{ gap: 12 }}>
        <View>
          <Text style={{ fontSize: 12, fontWeight: '700', color: textMuted, marginBottom: 6 }}>M-Pesa Send Money (Phone)</Text>
          <TextInput style={inputStyle} value={mpesaPhone} onChangeText={onPhone} placeholder="+254 700 000 000" placeholderTextColor={textMuted} keyboardType="phone-pad" />
        </View>
        <View>
          <Text style={{ fontSize: 12, fontWeight: '700', color: textMuted, marginBottom: 6 }}>M-Pesa Paybill Number</Text>
          <TextInput style={inputStyle} value={mpesaPaybillNum} onChangeText={onPaybillNum} placeholder="Paybill number" placeholderTextColor={textMuted} keyboardType="number-pad" />
        </View>
        <View>
          <Text style={{ fontSize: 12, fontWeight: '700', color: textMuted, marginBottom: 6 }}>M-Pesa Paybill Account</Text>
          <TextInput style={inputStyle} value={mpesaPaybillAcc} onChangeText={onPaybillAcc} placeholder="Account number" placeholderTextColor={textMuted} />
        </View>
      </View>
    </View>
  )
}
