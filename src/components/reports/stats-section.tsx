// StatsSection — 5-stat card grid + date range row for reports page
// Pure presentation: no business logic, no API calls.

import { View, Text, StyleSheet } from 'react-native'
import { TrendingUp, Banknote, Smartphone, AlertCircle, Receipt } from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import { StatCard } from './stat-card'
import { formatCurrency } from '../../lib/utils'
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

export function StatsSection({ stats, debtCollected, dateRangeLabel }: Props) {
  const { card, border, text, textSecondary: textMuted } = useTheme()
  return (
    <>
      <View style={styles.grid}>
        <StatCard label="Total Sales" amount={stats.total.amount} count={stats.total.count}
          icon={<TrendingUp size={18} color="#F97316" />} accent="#F97316" />
        <StatCard label="Cash Sales" amount={stats.cash.amount} count={stats.cash.count}
          icon={<Banknote size={18} color="#22C55E" />} accent="#22C55E" />
        <StatCard label="M-Pesa Sales" amount={stats.mpesa.amount} count={stats.mpesa.count}
          icon={<Smartphone size={18} color="#10B981" />} accent="#10B981" />
        <StatCard label="Debt Sales" amount={stats.debt.amount} count={stats.debt.count}
          icon={<AlertCircle size={18} color="#F59E0B" />} accent="#F59E0B" />
        <StatCard label="Debt Collected" amount={debtCollected} count={0}
          icon={<Receipt size={18} color="#A855F7" />} accent="#A855F7" />
      </View>
      <View style={[styles.dateRange, { backgroundColor: card, borderColor: border }]}>
        <Text style={[styles.dateLabel, { color: textMuted }]}>Showing</Text>
        <Text style={[styles.dateValue, { color: text }]}>{dateRangeLabel}</Text>
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, padding: 8, gap: 8 },
  dateRange: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, marginHorizontal: 12, marginTop: 4, padding: 10, borderRadius: 8, borderWidth: 1 },
  dateLabel: { fontSize: 12, fontWeight: '600' as const, textTransform: 'uppercase' as const },
  dateValue: { fontSize: 12, fontWeight: '700' as const },
})
