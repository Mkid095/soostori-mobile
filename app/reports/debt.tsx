// app/reports/debt.tsx — Phase 13: Debt Report screen with aging buckets
/** @jsxImportSource react */
import React, { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ArrowLeft, Users, AlertTriangle, Clock } from 'lucide-react-native'
import { useRouter } from 'expo-router'
import { useTheme } from '../../src/hooks/useTheme'
import { useDebtReport } from '../../src/hooks/useReports'
import { formatCurrency } from '../../src/lib/formatters'

const BUCKET_LABELS: Record<string, string> = {
  '0-30': '0–30 days',
  '31-60': '31–60 days',
  '61-90': '61–90 days',
  '90+': '90+ days',
}

const BUCKET_COLORS: Record<string, string> = {
  '0-30': '#22C55E',
  '31-60': '#F59E0B',
  '61-90': '#F97316',
  '90+': '#EF4444',
}

export default function DebtReportScreen() {
  const { bg, card, text, muted, border, brand, danger, success } = useTheme()
  const router = useRouter()
  const { data: report, isLoading } = useDebtReport()

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: card, borderBottomColor: border }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <ArrowLeft size={20} color={text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: text }]}>Debt Report</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {isLoading && (
          <View style={[s.emptyCard, { backgroundColor: card, borderColor: border }]}>
            <Text style={{ color: muted }}>Loading...</Text>
          </View>
        )}

        {!isLoading && !report && (
          <View style={[s.emptyCard, { backgroundColor: card, borderColor: border }]}>
            <Users size={32} color={muted} />
            <Text style={{ color: muted, marginTop: 8 }}>No debt data</Text>
          </View>
        )}

        {report && (
          <>
            {/* Summary KPIs */}
            <View style={[s.kpiRow]}>
              <KpiCard
                label="Outstanding"
                value={formatCurrency(report.totalOutstanding)}
                color={report.totalOutstanding > 0 ? danger : success}
              />
              <KpiCard
                label="Overdue"
                value={String(report.overdueCount)}
                icon={<AlertTriangle size={16} color={danger} />}
                color={report.overdueCount > 0 ? danger : success}
              />
              <KpiCard label="Partial" value={String(report.partialCount)} />
            </View>

            {/* Aging buckets */}
            <Text style={[s.sectionTitle, { color: text }]}>Aging Buckets</Text>
            <View style={[s.bucketGrid, { backgroundColor: card, borderColor: border }]}>
              {(Object.keys(BUCKET_LABELS) as Array<keyof typeof BUCKET_LABELS>).map(key => {
                const amount = report.agingBuckets[key] ?? 0
                const pct = report.totalOutstanding > 0 ? (amount / report.totalOutstanding) * 100 : 0
                return (
                  <View key={key} style={[s.bucketItem, { borderBottomColor: border }]}>
                    <View style={[s.bucketDot, { backgroundColor: BUCKET_COLORS[key] }]} />
                    <Text style={[s.bucketLabel, { color: muted }]}>{BUCKET_LABELS[key]}</Text>
                    <Text style={[s.bucketAmount, { color: BUCKET_COLORS[key] }]}>
                      {formatCurrency(amount)}
                    </Text>
                    <Text style={[s.bucketPct, { color: muted }]}>{pct.toFixed(0)}%</Text>
                  </View>
                )
              })}
            </View>

            {/* By customer */}
            {report.byCustomer.length > 0 && (
              <>
                <Text style={[s.sectionTitle, { color: text }]}>
                  By Customer ({report.byCustomer.length})
                </Text>
                {report.byCustomer.map((c: { customerId: string; name: string; outstanding: number; debtCount: number }) => (
                  <View key={c.customerId} style={[s.row, { backgroundColor: card, borderColor: border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.rowLabel, { color: text }]} numberOfLines={1}>{c.name}</Text>
                      <Text style={[s.rowSub, { color: muted }]}>
                        {c.debtCount} debt{c.debtCount !== 1 ? 's' : ''}
                      </Text>
                    </View>
                    <Text style={[s.rowAmount, { color: c.outstanding > 0 ? danger : success }]}>
                      {formatCurrency(c.outstanding)}
                    </Text>
                  </View>
                ))}
              </>
            )}

            {/* Empty */}
            {report.byCustomer.length === 0 && report.totalOutstanding === 0 && (
              <View style={[s.emptyCard, { backgroundColor: card, borderColor: border }]}>
                <Users size={32} color={success} />
                <Text style={{ color: success, marginTop: 8 }}>No outstanding debts</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function KpiCard({ label, value, icon, color }: { label: string; value: string; icon?: React.ReactElement; color?: string }) {
  const { card, text, muted, border } = useTheme()
  return (
    <View style={[s.kpiCard, { backgroundColor: card, borderColor: border }]}>
      {icon && <View style={{ marginBottom: 4 }}>{icon}</View>}
      <Text style={[s.kpiValue, { color: color ?? text }]}>{value}</Text>
      <Text style={[s.kpiLabel, { color: muted }]}>{label}</Text>
    </View>
  )
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 14, borderBottomWidth: 1 },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 17, fontWeight: '800' },
  kpiRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  kpiCard: { flex: 1, borderRadius: 12, padding: 12, borderWidth: 1, alignItems: 'center' },
  kpiLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 4 },
  kpiValue: { fontSize: 15, fontWeight: '900' },
  sectionTitle: { fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 4 },
  bucketGrid: { borderRadius: 12, borderWidth: 1, overflow: 'hidden', marginBottom: 12 },
  bucketItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1 },
  bucketDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  bucketLabel: { flex: 1, fontSize: 13 },
  bucketAmount: { fontSize: 13, fontWeight: '800', marginRight: 8 },
  bucketPct: { fontSize: 11, minWidth: 36, textAlign: 'right' },
  row: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, padding: 12, borderWidth: 1, marginBottom: 8 },
  rowLabel: { fontSize: 14, fontWeight: '600' },
  rowSub: { fontSize: 11, marginTop: 2 },
  rowAmount: { fontSize: 14, fontWeight: '800' },
  emptyCard: { borderRadius: 12, padding: 40, alignItems: 'center', borderWidth: 1 },
})
