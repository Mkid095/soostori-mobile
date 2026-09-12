// sale-line-items.tsx — Phase 19: sale line items + subtotal
import { View, Text, StyleSheet } from 'react-native'
import { formatCurrency } from '../../../src/lib/formatters'

export function SaleLineItems({ items, subtotal }: {
  items: Array<{ id?: string; productName?: string; quantity: number; unitPrice: number; totalPrice: number }>
  subtotal: number
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Items</Text>
      {items.map((item, i) => (
        <View key={item.id ?? i} style={[styles.row, i > 0 && { borderTopColor: '#e5e7eb', borderTopWidth: 1 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>
              {item.productName ?? 'Unknown Product'}
            </Text>
            <Text style={styles.sub}>
              {item.quantity} × {formatCurrency(item.unitPrice)}
            </Text>
          </View>
          <Text style={styles.total}>{formatCurrency(item.totalPrice)}</Text>
        </View>
      ))}
      <View style={[styles.divider, { backgroundColor: '#e5e7eb', marginTop: 8 }]} />
      <View style={styles.subtotalRow}>
        <Text style={styles.subtotalLabel}>Subtotal</Text>
        <Text style={styles.subtotalValue}>{formatCurrency(subtotal)}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, padding: 16, borderWidth: 1, marginBottom: 12 },
  title: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 10, color: '#111827' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  name: { fontSize: 14, fontWeight: '600', color: '#111827' },
  sub: { fontSize: 12, marginTop: 2, color: '#6b7280' },
  total: { fontSize: 14, fontWeight: '800', color: '#111827' },
  divider: { height: 1, marginVertical: 8 },
  subtotalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  subtotalLabel: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  subtotalValue: { fontSize: 14, fontWeight: '800', color: '#111827' },
})
