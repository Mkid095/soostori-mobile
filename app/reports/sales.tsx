// app/reports/sales.tsx — Phase 13: Sales Report screen with date range picker
import React, { useState, useMemo } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ArrowLeft, TrendingUp } from 'lucide-react-native'
import { useRouter } from 'expo-router'
import { useTheme } from '../../src/hooks/useTheme'
import { useSalesReport } from '../../src/hooks/useReports'
import { formatCurrency, formatDate } from '../../src/lib/formatters'

type DateFilter = 'today' | 'week' | 'month' | 'custom'

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Cash',
  mpesa: 'M-Pesa',
  mobile_money: 'Mobile Money',
  card: 'Card',
  transfer: 'Transfer',
  debt: 'Debt',
}

const PM_COLORS: Record<string, string> = {
  cash: '#22C55E',
  mpesa: '#10B981',
  mobile_money: '#10B981',
  card: '#3B82F6',
  transfer: '#8B5CF6',
  debt: '#F59E0B',
}

export default function SalesReportScreen() {
  const { bg, card, text, muted, border, brand, success, danger } = useTheme()
  const router = useRouter()
  const [dateFilter, setDateFilter] = useState<DateFilter>('month')

  const { startIso, endIso } = useMemo(() => {
    const now = new Date()
    let start: Date, end: Date
    if (dateFilter === 'today') {
      start = new Date(now); start.setHours(0, 0, 0, 0)
      end = now
    } else if (dateFilter === 'week') {
      start = new Date(now); start.setDate(now.getDate() - 7); start.setHours(0, 0, 0, 0)
      end = now
    } else {
      // month or custom — default to this month
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
      end = now
    }
    return { startIso: start.toISOString(), endIso: end.toISOString() }
  }, [dateFilter])

  const { data: report, isLoading } = useSalesReport(startIso, endIso)

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: card, borderBottomColor: border }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <ArrowLeft size={20} color={text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: text }]}>Sales Report</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Date filter row */}
      <View style={[s.filterRow, { backgroundColor: card, borderBottomColor: border }]}>
        {(['today', 'week', 'month'] as DateFilter[]).map(f => (
          <TouchableOpacity
            key={f}
            style={[s.filterChip, { backgroundColor: dateFilter === f ? brand : bg, borderColor: border }]}
            onPress={() => setDateFilter(f)}
          >
            <Text style={[s.filterChipText, { color: dateFilter === f ? '#fff' : muted }]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
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
            <Text style={{ color: muted, marginTop: 8 }}>No data</Text>
          </View>
        )}

        {report && (
          <>
            {/* KPI row */}
            <View style={[s.kpiRow]}>
              <KpiCard label="Total Sales" value={String(report.salesCount)} sub="transactions" />
              <KpiCard label="Revenue" value={formatCurrency(report.totalRevenue)} />
              <KpiCard label="Avg Sale" value={formatCurrency(report.averageSaleValue)} />
            </View>

            {/* Gross profit / margin */}
            <View style={[s.profitCard, { backgroundColor: card, borderColor: border }]}>
              <View style={s.profitRow}>
                <View style={s.profitItem}>
                  <Text style={[s.profitLabel, { color: muted }]}>Gross Profit</Text>
                  <Text style={[s.profitValue, { color: report.grossProfit >= 0 ? success : danger }]}>
                    {formatCurrency(report.grossProfit)}
                  </Text>
                </View>
                <View style={[s.profitDivider, { backgroundColor: border }]} />
                <View style={s.profitItem}>
                  <Text style={[s.profitLabel, { color: muted }]}>Margin</Text>
                  <Text style={[s.profitValue, { color: brand }]}>
                    {report.grossMargin.toFixed(1)}%
                  </Text>
                </View>
              </View>
            </View>

            {/* Period */}
            {report.period.from && (
              <Text style={[s.periodLabel, { color: muted }]}>
                {formatDate(report.period.from)} – {formatDate(report.period.to ?? report.period.from)}
              </Text>
            )}

            {/* By payment method */}
            <Text style={[s.sectionTitle, { color: text }]}>By Payment Method</Text>
            {Object.entries(report.byPaymentMethod).map(([pm, v]) => {
              const payment = v as { count: number; amount: number }
              return (
              <View key={pm} style={[s.row, { backgroundColor: card, borderColor: border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={[s.pmDot, { backgroundColor: PM_COLORS[pm] ?? '#94A3B8' }]} />
                  <Text style={[s.rowLabel, { color: text }]}>{PAYMENT_LABELS[pm] ?? pm}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[s.rowAmount, { color: text }]}>{formatCurrency(payment.amount)}</Text>
                  <Text style={[s.rowSub, { color: muted }]}>{payment.count} txn</Text>
                </View>
              </View>
              )
            })}

            {/* Top products */}
            {report.topProducts.length > 0 && (
              <>
                <Text style={[s.sectionTitle, { color: text }]}>Top Products</Text>
                {report.topProducts.map((p: { productId: string; name: string; quantitySold: number; revenue: number }, i: number) => (
                  <View key={p.productId} style={[s.row, { backgroundColor: card, borderColor: border }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={[s.rank, { color: muted }]}>{i + 1}</Text>
                      <Text style={[s.rowLabel, { color: text }]} numberOfLines={1}>{p.name}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[s.rowAmount, { color: text }]}>{formatCurrency(p.revenue)}</Text>
                      <Text style={[s.rowSub, { color: muted }]}>{p.quantitySold} sold</Text>
                    </View>
                  </View>
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  const { card: cardBg, text, muted, border } = useTheme()
  return (
    <View style={[s.kpiCard, { backgroundColor: cardBg, borderColor: border }]}>
      <Text style={[s.kpiLabel, { color: muted }]}>{label}</Text>
      <Text style={[s.kpiValue, { color: text }]} numberOfLines={1}>{value}</Text>
      {sub && <Text style={[s.kpiSub, { color: muted }]}>{sub}</Text>}
    </View>
  )
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 14, borderBottomWidth: 1 },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 17, fontWeight: '800' },
  filterRow: { flexDirection: 'row', gap: 8, padding: 12, borderBottomWidth: 1 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  filterChipText: { fontSize: 13, fontWeight: '700' },
  kpiRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  kpiCard: { flex: 1, borderRadius: 12, padding: 12, borderWidth: 1, alignItems: 'center' },
  kpiLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  kpiValue: { fontSize: 15, fontWeight: '900', marginTop: 4 },
  kpiSub: { fontSize: 10, marginTop: 2 },
  profitCard: { borderRadius: 12, padding: 16, borderWidth: 1, marginBottom: 12 },
  profitRow: { flexDirection: 'row', alignItems: 'center' },
  profitItem: { flex: 1, alignItems: 'center' },
  profitDivider: { width: 1, height: 40 },
  profitLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  profitValue: { fontSize: 20, fontWeight: '900', marginTop: 4 },
  periodLabel: { fontSize: 11, marginBottom: 12, fontStyle: 'italic' },
  sectionTitle: { fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 10, padding: 12, borderWidth: 1, marginBottom: 8 },
  rowLabel: { fontSize: 14, fontWeight: '600', flex: 1 },
  rowAmount: { fontSize: 14, fontWeight: '800' },
  rowSub: { fontSize: 11, marginTop: 1 },
  pmDot: { width: 8, height: 8, borderRadius: 4 },
  rank: { fontSize: 13, fontWeight: '700', width: 20 },
  emptyCard: { borderRadius: 12, padding: 40, alignItems: 'center', borderWidth: 1 },
})
