// MpesaDetails — M-Pesa payment details display for pos-checkout
import { View, Text } from 'react-native'
import { useTheme } from '../../hooks/useTheme'
import type { ShopSettings } from '../../lib/types'
import type { PaymentMethod } from './usePaymentMethods'

interface Props {
  method: PaymentMethod
  settings: ShopSettings
}

export function MpesaDetails({ method, settings }: Props) {
  const { card, text, textSecondary: textMuted, border } = useTheme()
  const infoStyle = { backgroundColor: card, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: border }
  const labelStyle: object = { fontSize: 11, fontWeight: '700' as const, color: textMuted, textTransform: 'uppercase' as const, letterSpacing: 0.5 }
  const valueStyle: object = { fontSize: 16, fontWeight: '800' as const, color: text }

  if (method === 'sendMoney' || method === 'pochi') {
    const phone = method === 'sendMoney' ? settings.mpesaSendMoneyPhone : settings.mpesaPochiPhone
    return (
      <View style={infoStyle}>
        <Text style={labelStyle}>{method === 'pochi' ? 'Pochi Phone' : 'Send Money To'}</Text>
        <Text style={{ ...valueStyle, marginTop: 4 }}>{phone}</Text>
        <Text style={{ fontSize: 12, color: textMuted, marginTop: 6 }}>
          Customer should send {method === 'pochi' ? 'via Pochi' : 'money'} to the number above
        </Text>
      </View>
    )
  }
  if (method === 'mpesaPaybill' || method === 'bankPaybill') {
    const num = method === 'mpesaPaybill' ? settings.mpesaPaybillNumber : settings.bankPaybillNumber
    const acc = method === 'mpesaPaybill' ? settings.mpesaPaybillAccount : settings.bankPaybillAccount
    return (
      <View style={infoStyle}>
        <Text style={labelStyle}>{method === 'bankPaybill' ? 'Bank Paybill' : 'Paybill Number'}</Text>
        <Text style={{ ...valueStyle, marginTop: 4 }}>{num}</Text>
        <Text style={{ ...labelStyle, marginTop: 10 }}>Account Number</Text>
        <Text style={{ ...valueStyle, marginTop: 4 }}>{acc}</Text>
        <Text style={{ fontSize: 12, color: textMuted, marginTop: 6 }}>
          Customer should pay to {num} account {acc}
        </Text>
      </View>
    )
  }
  return null
}
