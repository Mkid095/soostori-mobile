// Cart summary panel (right side) for PosCheckoutModal
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native'
import { useTheme } from '../../hooks/useTheme'
import type { CartItem } from '../../lib/types'
import { formatCurrency } from '../../lib/formatters'

interface Props {
  cart: CartItem[]
  cartTotal: number
  onComplete: () => void
  isProcessing: boolean
}

export function CheckoutSummaryPanel({ cart, cartTotal, onComplete, isProcessing }: Props) {
  const { card, text, textSecondary, border, brand } = useTheme()

  return (
    <View style={[s.container, { backgroundColor: card, borderLeftColor: border }]}>
      <View style={[s.amountDueBox, { backgroundColor: `${brand}15` }]}>
        <Text style={[s.amountDueLabel, { color: textSecondary }]}>Amount Due</Text>
        <Text style={[s.amountDueValue, { color: brand }]}>{formatCurrency(cartTotal)}</Text>
      </View>

      <FlatList
        data={cart}
        keyExtractor={(i) => i.productId}
        contentContainerStyle={{ padding: 8 }}
        renderItem={({ item }) => (
          <View style={[s.itemRow, { borderColor: border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[s.itemName, { color: text }]} numberOfLines={1}>{item.productName}</Text>
              <Text style={[s.itemPrice, { color: textSecondary }]}>
                {item.quantity} × {formatCurrency(item.unitPrice)}
              </Text>
            </View>
            <Text style={[s.itemTotal, { color: text }]}>{formatCurrency(item.totalPrice)}</Text>
          </View>
        )}
        style={{ flex: 1 }}
      />

      <View style={{ padding: 12, gap: 8 }}>
        <View style={[s.totalsRow, { borderColor: border }]}>
          <Text style={[s.totalsLabel, { color: textSecondary }]}>Subtotal</Text>
          <Text style={[s.totalsValue, { color: text }]}>{formatCurrency(cartTotal)}</Text>
        </View>
        <View style={[s.totalsRow, { borderColor: border }]}>
          <Text style={[s.totalsLabel, { color: textSecondary }]}>Discount</Text>
          <Text style={[s.totalsValue, { color: '#22C55E' }]}>-{formatCurrency(0)}</Text>
        </View>
        <View style={[s.totalsTotalRow, { backgroundColor: `${brand}15` }]}>
          <Text style={[s.totalsTotalLabel, { color: text }]}>Total</Text>
          <Text style={[s.totalsTotalValue, { color: brand }]}>{formatCurrency(cartTotal)}</Text>
        </View>

        <TouchableOpacity
          style={[s.completeBtn, {
            backgroundColor: isProcessing || cart.length === 0 ? textSecondary : brand,
          }]}
          onPress={onComplete}
          disabled={isProcessing || cart.length === 0}
        >
          <Text style={s.completeBtnText}>
            {isProcessing ? 'Processing...' : `Complete Sale — ${formatCurrency(cartTotal)}`}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, borderLeftWidth: 1 },
  amountDueBox: { padding: 16, alignItems: 'center', borderRadius: 12, margin: 12 },
  amountDueLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
  amountDueValue: { fontSize: 28, fontWeight: '800', marginTop: 4 },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  itemName: { fontSize: 12, fontWeight: '600' },
  itemPrice: { fontSize: 10, marginTop: 1 },
  itemTotal: { fontSize: 12, fontWeight: '700' },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  totalsLabel: { fontSize: 12 },
  totalsValue: { fontSize: 12, fontWeight: '600' },
  totalsTotalRow: { borderRadius: 8, padding: 10, flexDirection: 'row', justifyContent: 'space-between' },
  totalsTotalLabel: { fontSize: 14, fontWeight: '700' },
  totalsTotalValue: { fontSize: 16, fontWeight: '800' },
  completeBtn: { borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  completeBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
})
