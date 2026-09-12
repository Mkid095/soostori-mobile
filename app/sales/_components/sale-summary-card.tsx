// sale-summary-card.tsx — Phase 19: sale summary + status card
import { View, Text, StyleSheet } from 'react-native'
import { CheckCircle } from 'lucide-react-native'
import { formatCurrency, formatDate } from '../../../src/lib/formatters'
import type { SaleStatus } from '../../../src/types/types'

export function SaleSummaryCard({ sale }: { sale: {
  createdAt: string
  status: SaleStatus
  totalAmount: number
  discountAmount: number
  subtotal: number
} }) {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Date</Text>
          <Text style={styles.value}>{formatDate(sale.createdAt)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <View style={[styles.badge, {
            backgroundColor: sale.status === 'completed' ? '#22c55e20' : '#3b82f620',
          }]}>
            <CheckCircle size={12} color={sale.status === 'completed' ? '#22c55e' : '#3b82f6'} />
            <Text style={[styles.badgeText, {
              color: sale.status === 'completed' ? '#22c55e' : '#3b82f6',
            }]}>{sale.status}</Text>
          </View>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: '#e5e7eb' }]} />

      <View>
        <Text style={styles.label}>Total</Text>
        <Text style={styles.total}>{formatCurrency(sale.totalAmount)}</Text>
      </View>

      {sale.discountAmount > 0 && (
        <View style={{ marginTop: 8 }}>
          <Text style={styles.label}>Discount</Text>
          <Text style={[styles.value, { color: '#22c55e' }]}>
            -{formatCurrency(sale.discountAmount)}
          </Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, padding: 16, borderWidth: 1, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  label: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, color: '#6b7280' },
  value: { fontSize: 15, fontWeight: '600', marginTop: 2, color: '#111827' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: '800' },
  divider: { height: 1, marginVertical: 10 },
  total: { fontSize: 32, fontWeight: '900', marginTop: 2, color: '#111827' },
})
