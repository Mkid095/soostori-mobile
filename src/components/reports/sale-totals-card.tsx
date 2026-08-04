// SaleTotalsCard — subtotal, discount, and grand total for a sale
// Pure presentation: no business logic, no API calls.

import { View, Text, StyleSheet } from 'react-native'
import { useTheme } from '../../hooks/useTheme'
import type { Sale } from '../../lib/types'
import { formatCurrency } from '../../lib/utils'

interface Props {
  sale: Sale
}

export function SaleTotalsCard({ sale }: Props) {
  const { card, border, text, brand } = useTheme()
  return (
    <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
      <View style={styles.row}>
        <Text style={[styles.label, { color: text }]}>Subtotal</Text>
        <Text style={[styles.value, { color: text }]}>{formatCurrency(sale.subtotal)}</Text>
      </View>
      {sale.discountAmount > 0 && (
        <View style={styles.row}>
          <Text style={[styles.label, { color: text }]}>Discount</Text>
          <Text style={[styles.value, { color: '#EF4444' }]}>
            -{formatCurrency(sale.discountAmount)}
          </Text>
        </View>
      )}
      <View style={[styles.grandRow, { borderTopColor: border }]}>
        <Text style={[styles.grandLabel, { color: text }]}>Total</Text>
        <Text style={[styles.grandValue, { color: brand }]}>
          {formatCurrency(sale.totalAmount)}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 12, marginBottom: 12, padding: 14, borderRadius: 12, borderWidth: 1 },
  row: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, marginBottom: 6 },
  label: { fontSize: 13 },
  value: { fontSize: 13, fontWeight: '600' as const },
  grandRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, paddingTop: 10, marginTop: 4, borderTopWidth: 1 },
  grandLabel: { fontSize: 15, fontWeight: '800' as const },
  grandValue: { fontSize: 18, fontWeight: '800' as const },
})
