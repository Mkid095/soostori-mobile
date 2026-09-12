// debt-history.tsx — Phase 19: customer debt history sub-component
import { View, Text, StyleSheet } from 'react-native'
import { useTheme } from '../../../src/hooks/useTheme'
import { formatCurrency, formatDate } from '../../../src/lib/formatters'
import type { DebtEntry, DebtPaymentEntry } from '../../../src/services/customers-service'

export function DebtHistory({
  debts, payments, totalDebt,
}: {
  debts: DebtEntry[]
  payments: DebtPaymentEntry[]
  totalDebt: number
}) {
  const { card, text, muted, border, success, danger } = useTheme()
  return (
    <View>
      <View style={[styles.debtCard, { backgroundColor: card, borderColor: border }]}>
        <Text style={[styles.debtLabel, { color: muted }]}>Outstanding Balance</Text>
        <Text style={[styles.debtAmount, { color: totalDebt > 0 ? danger : success }]}>
          {formatCurrency(totalDebt)}
        </Text>
      </View>

      {debts.map(debt => {
        const related = payments.filter(p => p.debtId === debt.id)
        return (
          <View key={debt.id} style={[styles.row, { backgroundColor: card, borderColor: border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: text }]}>{formatDate(debt.createdAt)}</Text>
              <Text style={[styles.rowSub, { color: muted }]}>
                Status: {debt.status}{debt.dueDate ? ` · Due: ${formatDate(debt.dueDate)}` : ''}
              </Text>
              {related.map(p => (
                <Text key={p.id} style={[styles.rowSub, { color: success }]}>
                  Payment {formatCurrency(p.amount)} on {formatDate(p.paidAt)}
                </Text>
              ))}
            </View>
            <Text style={[styles.rowAmount, { color: debt.status === 'paid' ? success : text }]}>
              {formatCurrency(debt.amount)}
            </Text>
          </View>
        )
      })}

      {debts.length === 0 && (
        <View style={styles.empty}><Text style={{ color: muted }}>No debt history</Text></View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  debtCard: { borderRadius: 12, padding: 20, borderWidth: 1, alignItems: 'center', marginBottom: 16 },
  debtLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  debtAmount: { fontSize: 28, fontWeight: '900', marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 10, padding: 12, borderWidth: 1, marginBottom: 8 },
  rowLabel: { fontSize: 14, fontWeight: '600' },
  rowSub: { fontSize: 12, marginTop: 2 },
  rowAmount: { fontSize: 14, fontWeight: '800' },
  empty: { padding: 40, alignItems: 'center' },
})
