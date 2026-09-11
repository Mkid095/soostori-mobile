// app/expenses/report.tsx — Phase 12: monthly expense report
// Breakdown by category with totals, percentages, and pending count.

import { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { ArrowLeft, TrendingUp } from 'lucide-react-native'
import { useTheme } from '../../src/hooks/useTheme'
import { useExpenseSummary } from '../../src/hooks/useExpenses'
import { formatCurrency } from '../../src/lib/formatters'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function ExpenseReportScreen() {
  const { bg, card, text, muted, border, brand } = useTheme()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [showYearPicker, setShowYearPicker] = useState(false)

  const { data: summary, isLoading } = useExpenseSummary(year, month)
  const monthLabel = `${MONTHS[month - 1]} ${year}`

interface CatEntry { amount: number; name: string; color: string }

  const categories = summary ? Object.entries(summary.byCategory) as [string, CatEntry][] : []
  const sortedCategories = categories.sort(([, a], [, b]) => b.amount - a.amount)

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i)

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['bottom']}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: card, borderBottomColor: border }]}>
        <TouchableOpacity onPress={() => useRouter().back()} style={s.backBtn}>
          <ArrowLeft size={20} color={text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: text }]}>Expense Report</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Month selector */}
      <View style={[s.monthSelector, { backgroundColor: card, borderBottomColor: border }]}>
        <TouchableOpacity
          style={s.monthArrow}
          onPress={() => {
            if (month === 1) { setMonth(12); setYear(y => y - 1) }
            else setMonth(m => m - 1)
          }}
        >
          <Text style={[s.arrow, { color: brand }]}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={[s.monthLabel, { color: text }]}>{monthLabel}</Text>
        <TouchableOpacity
          style={s.monthArrow}
          onPress={() => {
            if (month === 12) { setMonth(1); setYear(y => y + 1) }
            else setMonth(m => m + 1)
          }}
        >
          <Text style={[s.arrow, { color: brand }]}>{'>'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        {/* Summary totals */}
        {summary && (
          <View style={[s.summaryCard, { backgroundColor: card, borderColor: border }]}>
            <View style={s.summaryRow}>
              <View style={s.summaryItem}>
                <Text style={[s.summaryLabel, { color: muted }]}>Total Spent</Text>
                <Text style={[s.summaryAmount, { color: text }]}>{formatCurrency(summary.total)}</Text>
              </View>
              <View style={[s.divider, { backgroundColor: border }]} />
              <View style={s.summaryItem}>
                <Text style={[s.summaryLabel, { color: muted }]}>Pending</Text>
                <Text style={[s.summaryAmount, { color: summary.pendingCount > 0 ? '#F59E0B' : text }]}>
                  {summary.pendingCount}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Category breakdown */}
        <Text style={[s.sectionTitle, { color: text }]}>By Category</Text>

        {isLoading && (
          <View style={[s.emptyCard, { backgroundColor: card, borderColor: border }]}>
            <Text style={{ color: muted }}>Loading...</Text>
          </View>
        )}

        {!isLoading && sortedCategories.length === 0 && (
          <View style={[s.emptyCard, { backgroundColor: card, borderColor: border }]}>
            <TrendingUp size={32} color="#94A3B8" />
            <Text style={{ color: muted, marginTop: 8 }}>No expenses for {monthLabel}</Text>
          </View>
        )}

        {sortedCategories.map(([catId, cat]) => {
          const pct = summary && summary.total > 0
            ? Math.round((cat.amount / summary.total) * 100)
            : 0
          return (
            <View key={catId} style={[s.catCard, { backgroundColor: card, borderColor: border }]}>
              <View style={s.catHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={[s.catDot, { backgroundColor: cat.color }]} />
                  <Text style={[s.catName, { color: text }]}>{cat.name}</Text>
                </View>
                <Text style={[s.catAmount, { color: text }]}>{formatCurrency(cat.amount)}</Text>
              </View>
              <View style={[s.progressTrack, { backgroundColor: border }]}>
                <View
                  style={[s.progressFill, { backgroundColor: cat.color, width: `${pct}%` }]}
                />
              </View>
              <Text style={[s.catPct, { color: muted }]}>{pct}% of total</Text>
            </View>
          )
        })}
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 14, borderBottomWidth: 1 },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 17, fontWeight: '800' },
  monthSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderBottomWidth: 1 },
  monthArrow: { paddingHorizontal: 20, paddingVertical: 6 },
  arrow: { fontSize: 18, fontWeight: '800' },
  monthLabel: { fontSize: 16, fontWeight: '700', minWidth: 100, textAlign: 'center' },
  summaryCard: { borderRadius: 16, padding: 20, borderWidth: 1, marginBottom: 20 },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryAmount: { fontSize: 24, fontWeight: '900', marginTop: 4 },
  divider: { width: 1, height: 40 },
  sectionTitle: { fontSize: 14, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  emptyCard: { borderRadius: 16, padding: 40, alignItems: 'center', borderWidth: 1 },
  catCard: { borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1 },
  catHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  catDot: { width: 10, height: 10, borderRadius: 5 },
  catName: { fontSize: 14, fontWeight: '600' },
  catAmount: { fontSize: 15, fontWeight: '800' },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  progressFill: { height: '100%', borderRadius: 3 },
  catPct: { fontSize: 11 },
})
