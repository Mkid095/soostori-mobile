// purchase-history.tsx — Phase 19: purchase history sub-component
import { View, Text, StyleSheet } from 'react-native'
import { useTheme } from '../../../src/hooks/useTheme'
import { formatCurrency, formatDate } from '../../../src/lib/formatters'
import type { CustomerPurchase } from '../../../src/services/customers-service'

const PM_LABELS: Record<string, string> = {
  cash: 'Cash', mpesa: 'M-Pesa', mobile_money: 'Mobile Money',
  card: 'Card', transfer: 'Transfer', debt: 'Debt',
}

export function PurchaseHistory({ sales }: { sales: CustomerPurchase[] }) {
  const { card, text, muted, border } = useTheme()
  if (sales.length === 0) {
    return <View style={styles.empty}><Text style={{ color: muted }}>No purchase history</Text></View>
  }
  return (
    <View>
      {sales.map(s => (
        <View key={s.id} style={[styles.row, { backgroundColor: card, borderColor: border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowLabel, { color: text }]}>{formatDate(s.createdAt)}</Text>
            {s.itemsSummary && (
              <Text style={[styles.rowSub, { color: muted }]} numberOfLines={1}>{s.itemsSummary}</Text>
            )}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.rowAmount, { color: text }]}>{formatCurrency(s.totalAmount)}</Text>
            <Text style={[styles.rowSub, { color: muted }]}>{PM_LABELS[s.paymentMethod] ?? s.paymentMethod}</Text>
          </View>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 10, padding: 12, borderWidth: 1, marginBottom: 8 },
  rowLabel: { fontSize: 14, fontWeight: '600' },
  rowSub: { fontSize: 12, marginTop: 2 },
  rowAmount: { fontSize: 14, fontWeight: '800' },
  empty: { padding: 40, alignItems: 'center' },
})
