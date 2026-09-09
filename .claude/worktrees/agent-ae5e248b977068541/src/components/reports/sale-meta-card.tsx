// SaleMetaCard — sale metadata display (ID, date, payment, note, customer ID)
// Pure presentation: no business logic, no API calls.

import { View, Text, StyleSheet } from 'react-native'
import { useTheme } from '../../hooks/useTheme'
import type { Sale } from '../../lib/types'
import { formatDate, formatTime } from '../../lib/formatters'
import { PaymentBadge } from './payment-badge'

interface Props {
  sale: Sale
}

export function SaleMetaCard({ sale }: Props) {
  const { card, border, text } = useTheme()
  return (
    <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
      <View style={styles.row}>
        <Text style={[styles.label, { color: text }]}>Sale ID</Text>
        <Text style={[styles.value, { color: text }]}>{sale.id.slice(0, 8)}</Text>
      </View>
      <View style={styles.row}>
        <Text style={[styles.label, { color: text }]}>Date & Time</Text>
        <Text style={[styles.value, { color: text }]}>
          {formatDate(sale.createdAt)} {formatTime(sale.createdAt)}
        </Text>
      </View>
      <View style={styles.row}>
        <Text style={[styles.label, { color: text }]}>Payment</Text>
        <PaymentBadge method={sale.paymentMethod} />
      </View>
      {sale.customerIdNumber && (
        <View style={styles.row}>
          <Text style={[styles.label, { color: text }]}>Customer ID</Text>
          <Text style={[styles.value, { color: text }]}>{sale.customerIdNumber}</Text>
        </View>
      )}
      {sale.note && (
        <View style={styles.row}>
          <Text style={[styles.label, { color: text }]}>Note</Text>
          <Text style={[styles.note, { color: text }]}>{sale.note}</Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: { margin: 12, padding: 14, borderRadius: 12, borderWidth: 1 },
  row: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, marginBottom: 8 },
  label: { fontSize: 13, fontWeight: '600' as const },
  value: { fontSize: 13, fontWeight: '500' as const },
  note: { fontSize: 13, fontStyle: 'italic' as const, maxWidth: '60%' as const, textAlign: 'right' as const },
})
