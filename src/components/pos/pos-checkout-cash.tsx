// Cash payment panel for PosCheckoutModal
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native'
import { useTheme } from '../../hooks/useTheme'
import { formatCurrency } from '../../lib/utils'

interface Props {
  amountTendered: string
  onAmountChange: (v: string) => void
  cashTotal: number
  onQuickAmount: (v: number) => void
}

export function roundUp(amount: number, nearest: number): number {
  return Math.ceil(amount / nearest) * nearest
}

export function CashPaymentPanel({ amountTendered, onAmountChange, cashTotal, onQuickAmount }: Props) {
  const { card, text, textSecondary, border, brand, success, danger } = useTheme()
  const tenderedNum = parseFloat(amountTendered) || 0
  const changeAmount = Math.max(0, tenderedNum - cashTotal)

  return (
    <View style={s.container}>
      <TouchableOpacity style={s.backBtn} onPress={() => {}}>
        <Text style={s.backBtnText}>← Back</Text>
      </TouchableOpacity>

      <Text style={s.sectionTitle}>Cash Payment</Text>

      <View style={[s.infoBox, { backgroundColor: card, borderColor: border }]}>
        <Text style={[s.labelStyle, { color: textSecondary }]}>Total to Pay</Text>
        <Text style={[s.valueLarge, { color: brand }]}>{formatCurrency(cashTotal)}</Text>
      </View>

      <Text style={[s.inputLabelStyle, { color: text }]}>Amount Tendered</Text>
      <TextInput
        style={[s.textInput, { backgroundColor: card, borderColor: border, color: text }]}
        placeholder="0.00"
        placeholderTextColor={textSecondary}
        keyboardType="numeric"
        value={amountTendered}
        onChangeText={onAmountChange}
      />

      <Text style={[s.inputLabelStyle, { color: text }]}>Quick Amounts</Text>
      <View style={s.quickRow}>
        {[roundUp(cashTotal, 50), roundUp(cashTotal, 100), roundUp(cashTotal, 500), roundUp(cashTotal, 1000)].map((amt) => (
          <TouchableOpacity
            key={amt}
            style={[s.quickBtn, { backgroundColor: card, borderColor: border }]}
            onPress={() => onQuickAmount(amt)}
          >
            <Text style={[s.quickBtnText, { color: text }]}>{amt}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tenderedNum > 0 && (
        <View style={[s.changeBox, {
          backgroundColor: tenderedNum >= cashTotal ? `${success}20` : `${danger}20`,
          borderColor: tenderedNum >= cashTotal ? success : danger,
        }]}>
          <Text style={[s.changeLabel, { color: textSecondary }]}>
            {tenderedNum >= cashTotal ? 'Change:' : 'Short:'}
          </Text>
          <Text style={[s.changeValue, { color: tenderedNum >= cashTotal ? success : danger }]}>
            {formatCurrency(Math.abs(changeAmount))}
          </Text>
        </View>
      )}
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
  inputLabelStyle: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  textInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickBtn: { borderWidth: 1, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14 },
  quickBtnText: { fontSize: 13, fontWeight: '700' },
  changeBox: { borderWidth: 1.5, borderRadius: 12, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  changeLabel: { fontSize: 13 },
  changeValue: { fontSize: 20, fontWeight: '800' },
})
