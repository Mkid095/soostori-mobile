// ExpenseRow — single expense list item.
// Pure presentation: tap emits onPress event.
// Phase 12: added status badge.

import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useTheme } from '../../hooks/useTheme'
import type { Expense } from '../../lib/types'
import { formatCurrency } from '../../lib/formatters'

const STATUS_COLORS = {
  pending: '#F59E0B',
  approved: '#3B82F6',
  paid: '#10B981',
} as const

interface Props {
  expense: Expense
  onPress: (expense: Expense) => void
}

export function ExpenseRow({ expense, onPress }: Props) {
  const { card, text, muted, border } = useTheme()
  const statusColor = STATUS_COLORS[expense.status] ?? STATUS_COLORS.pending

  return (
    <TouchableOpacity
      style={[s.container, { backgroundColor: card, borderColor: border }]}
      onPress={() => onPress(expense)}
      activeOpacity={0.7}
    >
      <View style={[s.dot, { backgroundColor: expense.categoryColor ?? '#6B7280' }]} />
      <View style={s.content}>
        <Text style={[s.desc, { color: text }]} numberOfLines={1}>
          {expense.description || expense.categoryName || 'Expense'}
        </Text>
        {expense.reference && (
          <Text style={[s.ref, { color: muted }]} numberOfLines={1}>#{expense.reference}</Text>
        )}
      </View>
      <View style={s.right}>
        <Text style={[s.amount, { color: text }]}>{formatCurrency(expense.amount)}</Text>
        <View style={[s.badge, { backgroundColor: statusColor + '20' }]}>
          <Text style={[s.badgeText, { color: statusColor }]}>{expense.status}</Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}

const s = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  content: { flex: 1, minWidth: 0 },
  desc: { fontSize: 14, fontWeight: '600' },
  ref: { fontSize: 11, marginTop: 2 },
  right: { alignItems: 'flex-end', gap: 4 },
  amount: { fontSize: 15, fontWeight: '800' },
  badge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
})
