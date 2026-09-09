// StatsSection — compact 2-line stats display for reports page
// Pure presentation: no business logic, no API calls.

import { View, Text, StyleSheet } from 'react-native'
import { useTheme } from '../../hooks/useTheme'
import type { Sale } from '../../lib/types'

interface Stats {
  total: { amount: number; count: number }
  cash: { amount: number; count: number }
  mpesa: { amount: number; count: number }
  debt: { amount: number; count: number }
}

interface Props {
  stats: Stats
  debtCollected: number
  dateRangeLabel: string
}

/** Compact number formatting: 1234567 → "1.2M+", 123456 → "123K+", 9999 → "9.9K+" */
function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M+`
  if (n >= 10_000) return `${(n / 1_000).toFixed(1)}K+`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K+`
  return n.toLocaleString('en-KE')
}

const SEP = '  |  '

export function StatsSection({ stats, debtCollected, dateRangeLabel }: Props) {
  const { card, border, text, textSecondary: muted, brand } = useTheme()

  const line1 = [
    { label: 'Total', value: fmt(stats.total.amount), count: stats.total.count },
    { label: 'Cash', value: fmt(stats.cash.amount), count: stats.cash.count },
    { label: 'M-Pesa', value: fmt(stats.mpesa.amount), count: stats.mpesa.count },
    { label: 'Debt', value: fmt(stats.debt.amount), count: stats.debt.count },
  ]

  const line2Count = stats.total.count

  return (
    <View style={{ paddingHorizontal: 10, paddingTop: 8, paddingBottom: 4 }}>
      {/* Line 1 — payment method breakdown */}
      <View style={[ss.row, ss.line, { backgroundColor: card, borderColor: border }]}>
        {line1.map((item, i) => (
          <View key={item.label} style={ss.cell}>
            <Text style={[ss.cellValue, { color: item.label === 'Total' ? brand : text }]} numberOfLines={1}>
              {item.value}
            </Text>
            <Text style={[ss.cellLabel, { color: muted }]} numberOfLines={1}>
              {item.label}
            </Text>
          </View>
        ))}
      </View>

      {/* Line 2 — debt collected + transaction count */}
      <View style={[ss.row, { backgroundColor: card, borderColor: border }]}>
        <View style={ss.cell}>
          <Text style={[ss.cellValue, { color: '#A855F7' }]} numberOfLines={1}>
            {fmt(debtCollected)}
          </Text>
          <Text style={[ss.cellLabel, { color: muted }]} numberOfLines={1}>Debt Repaid</Text>
        </View>
        <View style={[ss.divider, { backgroundColor: border }]} />
        <View style={ss.cell}>
          <Text style={[ss.cellValue, { color: text }]} numberOfLines={1}>
            {line2Count}
          </Text>
          <Text style={[ss.cellLabel, { color: muted }]} numberOfLines={1}>Transactions</Text>
        </View>
        <View style={[ss.divider, { backgroundColor: border }]} />
        <View style={ss.cell}>
          <Text style={[ss.cellValue, { color: muted }]} numberOfLines={1}>
            {dateRangeLabel}
          </Text>
          <Text style={[ss.cellLabel, { color: muted }]} numberOfLines={1}>Period</Text>
        </View>
      </View>
    </View>
  )
}

const ss = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 6,
    paddingVertical: 10,
    paddingHorizontal: 4,
    overflow: 'hidden',
  },
  line: {
    // top row is slightly taller
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  cellValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  cellLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  divider: {
    width: 1,
    alignSelf: 'stretch',
    marginVertical: 4,
  },
})
