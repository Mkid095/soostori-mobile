// SaleItemsCard — line items table for a sale in the detail modal
// Pure presentation: no business logic, no API calls.

import { View, Text, StyleSheet } from 'react-native'
import { useTheme } from '../../hooks/useTheme'
import type { SaleItem } from '../../lib/types'
import { formatCurrency } from '../../lib/utils'

interface Props {
  items: SaleItem[]
  items_summary?: string
}

export function SaleItemsCard({ items, items_summary }: Props) {
  const { card, border, text } = useTheme()

  return (
    <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
      <Text style={[styles.title, { color: text }]}>Items</Text>
      {items.length === 0 ? (
        <Text style={[styles.empty, { color: text }]}>{items_summary ?? 'No items'}</Text>
      ) : (
        <>
          <View style={[styles.header, { borderBottomColor: border }]}>
            <Text style={[styles.col, { color: text }]}>Item</Text>
            <Text style={[styles.col, styles.colQty, { color: text }]}>Qty</Text>
            <Text style={[styles.col, styles.colPrice, { color: text }]}>Price</Text>
            <Text style={[styles.col, styles.colTotal, { color: text }]}>Total</Text>
          </View>
          {items.map((item) => (
            <View key={item.id} style={[styles.row, { borderBottomColor: border }]}>
              <Text style={[styles.col, { color: text }]} numberOfLines={2}>
                {item.productName}
              </Text>
              <Text style={[styles.col, styles.colQty, { color: text }]}>{item.quantity}</Text>
              <Text style={[styles.col, styles.colPrice, { color: text }]}>
                {formatCurrency(item.unitPrice)}
              </Text>
              <Text style={[styles.col, styles.colTotal, { color: text }]}>
                {formatCurrency(item.totalPrice)}
              </Text>
            </View>
          ))}
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 12, marginBottom: 8, padding: 14, borderRadius: 12, borderWidth: 1 },
  title: { fontSize: 14, fontWeight: '800' as const, marginBottom: 10 },
  empty: { fontSize: 13, fontStyle: 'italic' as const },
  header: { flexDirection: 'row' as const, paddingBottom: 6, borderBottomWidth: 1, marginBottom: 4 },
  row: { flexDirection: 'row' as const, paddingVertical: 7, borderBottomWidth: 1 },
  col: { fontSize: 12, flex: 1 },
  colQty: { flex: 0.5 as const, textAlign: 'center' as const },
  colPrice: { flex: 1, textAlign: 'right' as const },
  colTotal: { flex: 1, textAlign: 'right' as const, fontWeight: '700' as const },
})
