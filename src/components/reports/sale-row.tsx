// SaleRow — individual sale transaction row for the reports list
// Pure presentation: no business logic, no API calls.

import { View, Text, TouchableOpacity } from 'react-native'
import { ChevronRight, Banknote, Smartphone, AlertCircle, Receipt } from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import type { Sale } from '../../lib/types'
import { formatCurrency, formatDate, formatTime } from '../../lib/utils'

const PAYMENT_COLOR: Record<string, string> = {
  cash: '#22C55E',
  mpesa: '#10B981',
  mobile_money: '#10B981',
  debt: '#F59E0B',
}

const PAYMENT_LABEL: Record<string, string> = {
  cash: 'Cash',
  mpesa: 'M-Pesa',
  mobile_money: 'Mobile Money',
  debt: 'Debt',
}

function getPaymentIcon(method: string, color: string) {
  if (method === 'cash') return <Banknote size={14} color={color} />
  if (method === 'mpesa' || method === 'mobile_money') return <Smartphone size={14} color={color} />
  if (method === 'debt') return <AlertCircle size={14} color={color} />
  return <Receipt size={14} color={color} />
}

interface Props {
  sale: Sale
  onPress: () => void
}

export function SaleRow({ sale, onPress }: Props) {
  const { card, border, text, textSecondary: textMuted } = useTheme()
  const accent = PAYMENT_COLOR[sale.paymentMethod] ?? '#64748B'
  const methodLabel = PAYMENT_LABEL[sale.paymentMethod] ?? sale.paymentMethod

  return (
    <TouchableOpacity
      style={[styles.row, { backgroundColor: card, borderColor: border, borderLeftColor: accent }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.left}>
        <View style={[styles.icon, { backgroundColor: `${accent}20` }]}>
          {getPaymentIcon(sale.paymentMethod, accent)}
        </View>
        <View style={styles.info}>
          <Text style={[styles.amount, { color: text }]}>{formatCurrency(sale.totalAmount)}</Text>
          <Text style={[styles.meta, { color: textMuted }]} numberOfLines={1}>
            {methodLabel} &bull; {sale.items_summary ?? `${(sale.items ?? []).length} item${(sale.items ?? []).length !== 1 ? 's' : ''}`}
          </Text>
        </View>
      </View>
      <View style={styles.right}>
        <Text style={[styles.date, { color: textMuted }]}>{formatDate(sale.createdAt)}</Text>
        <Text style={[styles.time, { color: textMuted }]}>{formatTime(sale.createdAt)}</Text>
        <ChevronRight size={14} color="#94A3B8" />
      </View>
    </TouchableOpacity>
  )
}

const styles = {
  row: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, marginHorizontal: 12, marginBottom: 8, padding: 12, borderRadius: 10, borderLeftWidth: 4 },
  left: { flexDirection: 'row' as const, alignItems: 'center' as const, flex: 1, gap: 10 },
  icon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center' as const, alignItems: 'center' as const },
  info: { flex: 1 },
  amount: { fontSize: 15, fontWeight: '800' as const },
  meta: { fontSize: 11, marginTop: 2 },
  right: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6 },
  date: { fontSize: 11 },
  time: { fontSize: 11 },
}
