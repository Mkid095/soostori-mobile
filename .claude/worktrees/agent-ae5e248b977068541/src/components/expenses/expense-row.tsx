// ExpenseRow — single expense list item.
// Pure presentation: tap emits onPress event.

import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useTheme } from '../../hooks/useTheme'
import type { Expense } from '../../lib/types'
import { formatCurrency } from '../../lib/formatters'

interface Props {
  expense: Expense
  onPress: (expense: Expense) => void
}

export function ExpenseRow({ expense, onPress }: Props) {
  const { card, text, muted, border } = useTheme()

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
      <Text style={[s.amount, { color: text }]}>{formatCurrency(expense.amount)}</Text>
    </TouchableOpacity>
  )
}

const s = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  content: { flex: 1, minWidth: 0 },
  desc: { fontSize: 14, fontWeight: '600' },
  ref: { fontSize: 11, marginTop: 2 },
  amount: { fontSize: 15, fontWeight: '800', marginLeft: 8 },
})
