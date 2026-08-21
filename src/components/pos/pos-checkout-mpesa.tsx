// M-Pesa payment panel for PosCheckoutModal
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Check } from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import type { ShopSettings } from '../../lib/types'

interface Props {
  mpesaConfirmed: boolean
  onConfirm: () => void
  shopSettings: ShopSettings | null
}

export function MpesaPaymentPanel({ mpesaConfirmed, onConfirm, shopSettings }: Props) {
  const { card, text, textSecondary, border, brand, success } = useTheme()

  return (
    <View style={s.container}>
      <TouchableOpacity style={s.backBtn} onPress={() => {}}>
        <Text style={s.backBtnText}>← Back</Text>
      </TouchableOpacity>

      <Text style={s.sectionTitle}>M-Pesa Payment</Text>

      <View style={[s.infoBox, { backgroundColor: card, borderColor: border }]}>
        <Text style={[s.labelStyle, { color: textSecondary }]}>Pay to:</Text>
        <Text style={[s.valueLarge, { color: brand }]}>
          {shopSettings?.mpesaPaybillNumber || shopSettings?.mpesaSendMoneyPhone || 'Not configured'}
        </Text>
        {shopSettings?.mpesaPaybillAccount && (
          <Text style={[s.subText, { color: textSecondary }]}>Account: {shopSettings.mpesaPaybillAccount}</Text>
        )}
      </View>

      <Text style={[s.instruction, { color: text }]}>
        Customer should send payment to the number above, then tap "I've Received Payment" below.
      </Text>

      <TouchableOpacity
        style={[s.confirmBtn, { backgroundColor: mpesaConfirmed ? success : brand }]}
        onPress={onConfirm}
        disabled={mpesaConfirmed}
      >
    // @ts-expect-error
        <Check size={18} color="#fff" />
        <Text style={s.confirmBtnText}>
          {mpesaConfirmed ? 'Payment Confirmed!' : "I've Received Payment"}
        </Text>
      </TouchableOpacity>
    </View>
  )
}

const s = StyleSheet.create({
  container: { gap: 12 },
  backBtn: { borderWidth: 1, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, alignSelf: 'flex-start' },
  backBtnText: { fontSize: 13, fontWeight: '600' },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  infoBox: { borderWidth: 1, borderRadius: 12, padding: 14 },
  labelStyle: { fontSize: 12, marginBottom: 4 },
  valueLarge: { fontSize: 20, fontWeight: '800' },
  subText: { fontSize: 12, marginTop: 2 },
  instruction: { fontSize: 13, lineHeight: 18 },
  confirmBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: 12 },
  confirmBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
})
