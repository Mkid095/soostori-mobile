// app/reports/expense.tsx — Phase 13: Monthly expense report with prior month comparison
import React, { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ArrowLeft, TrendingUp, TrendingDown } from 'lucide-react-native'
import { useRouter } from 'expo-router'
import { useTheme } from '../../src/hooks/useTheme'
import { useExpenseReport } from '../../src/hooks/useReports'
import { formatCurrency } from '../../src/lib/formatters'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function ExpenseReportScreen() {
  const { bg, card, text, muted, border, brand, success, danger } = useTheme()
  const router = useRouter()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  const { data: report, isLoading } = useExpenseReport(year, month)
  const monthLabel = `${MONTHS[month - 1]} ${year}`

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: card, borderBottomColor: border }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
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
            if (month === 1) { setMonth(12); setYear(year - 1) }
            else setMonth(month - 1)
          }}
        >
          <Text style={[s.arrow, { color: brand }]}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={[s.monthLabel, { color: text }]}>{monthLabel}</Text>
        <TouchableOpacity
          style={s.monthArrow}
          onPress={() => {
            if (month === 12) { setMonth(1); setYear(year + 1) }
            else setMonth(month + 1)
          }}
        >
          <Text style={[s.arrow, { color: brand }]}>{'>'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {isLoading && (
          <View style={[s.emptyCard, { backgroundColor: card, borderColor: border }]}>
            <Text style={{ color: muted }}>Loading...</Text>
          </View>
        )}

        {!isLoading && !report && (
          <View style={[s.emptyCard, { backgroundColor: card, borderColor: border }]}>
            <TrendingUp size={32} color={muted} />
            <Text style={{ color: muted, marginTop: 8 }}>No expense data</Text>
          </View>
        )}

        {report && (
          <>
            {/* Summary */}
            <View style={[s.summaryCard, { backgroundColor: card, borderColor: border }]}>
              <View style={s.summaryRow}>
                <View style={s.summaryItem}>
                  <Text style={[s.summaryLabel, { color: muted }]}>Total Spent</Text>
                  <Text style={[s.summaryAmount, { color: text }]}>{formatCurrency(report.total)}</Text>
                </View>
                <View style={[s.divider, { backgroundColor: border }]} />
                <View style={s.summaryItem}>
                  <Text style={[s.summaryLabel, { color: muted }]}>Pending</Text>
                  <Text style={[s.summaryAmount, { color: report.pendingCount > 0 ? '#F59E0B' : text }]}>
                    {report.pendingCount}
                  </Text>
                </View>
              </View>

              {/* Prior month comparison */}
              {report.vsPriorMonth !== 0 && (
                <View style={s.trendRow}>
                  {report.vsPriorMonth > 0
                    ? <TrendingUp size={14} color={danger} />
                    : <TrendingDown size={14} color={success} />}
                  <Text style={[s.trendText, { color: report.vsPriorMonth > 0 ? danger : success }]}>
                    {report.vsPriorMonth > 0 ? '+' : ''}{report.vsPriorMonth.toFixed(1)}%
                    {' '}vs prior month
                  </Text>
                </View>
              )}
            </View>

            {/* Category breakdown */}
            <Text style={[s.sectionTitle, { color: text }]}>By Category</Text>
            {Object.keys(report.byCategory).length === 0 && (
              <View style={[s.emptyCard, { backgroundColor: card, borderColor: border }]}>
                <Text style={{ color: muted }}>No expenses for {monthLabel}</Text>
              </View>
            )}
            {(Object.entries(report.byCategory) as [string, number][])
              .sort(([, a], [, b]) => b - a)
              .map(([catId, amount]) => {
                const pct = report.total > 0 ? Math.round((amount / report.total) * 100) : 0
                return (
                  <View key={catId} style={[s.catCard, { backgroundColor: card, borderColor: border }]}>
                    <View style={s.catHeader}>
                      <Text style={[s.catName, { color: text }]} numberOfLines={1}>{catId}</Text>
                      <Text style={[s.catAmount, { color: text }]}>{formatCurrency(amount)}</Text>
                    </View>
                    <View style={[s.progressTrack, { backgroundColor: border }]}>
                      <View style={[s.progressFill, { backgroundColor: brand, width: `${pct}%` }]} />
                    </View>
                    <Text style={[s.catPct, { color: muted }]}>{pct}% of total</Text>
                  </View>
                )
              })}
          </>
        )}
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
  trendRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 12 },
  trendText: { fontSize: 12, fontWeight: '700' },
  sectionTitle: { fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  emptyCard: { borderRadius: 12, padding: 40, alignItems: 'center', borderWidth: 1 },
  catCard: { borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1 },
  catHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  catName: { fontSize: 14, fontWeight: '600', flex: 1 },
  catAmount: { fontSize: 15, fontWeight: '800' },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  progressFill: { height: '100%', borderRadius: 3 },
  catPct: { fontSize: 11 },
})
