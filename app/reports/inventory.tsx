// app/reports/inventory.tsx — Phase 13: Inventory Report screen
/** @jsxImportSource react */
import React, { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ArrowLeft, Package, AlertTriangle, Clock } from 'lucide-react-native'
import { useRouter } from 'expo-router'
import { useTheme } from '../../src/hooks/useTheme'
import { useInventoryReport } from '../../src/hooks/useReports'
import { formatCurrency } from '../../src/lib/formatters'

export default function InventoryReportScreen() {
  const { bg, card, text, muted, border, brand, danger, success } = useTheme()
  const router = useRouter()
  const { data: report, isLoading } = useInventoryReport()

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: card, borderBottomColor: border }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <ArrowLeft size={20} color={text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: text }]}>Inventory Report</Text>
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
            <Package size={32} color={muted} />
            <Text style={{ color: muted, marginTop: 8 }}>No inventory data</Text>
          </View>
        )}

        {report && (
          <>
            {/* KPI summary */}
            <View style={[s.kpiRow]}>
              <KpiCard label="Products" value={String(report.totalProducts)} icon={<Package size={16} color={brand} />} />
              <KpiCard label="Stock Value" value={formatCurrency(report.totalStockValue)} />
              <KpiCard
                label="Low Stock"
                value={String(report.lowStockCount)}
                icon={<AlertTriangle size={16} color={danger} />}
                color={report.lowStockCount > 0 ? danger : success}
              />
            </View>

            {/* Out of stock alert */}
            {report.outOfStockCount > 0 && (
              <View style={[s.alertCard, { backgroundColor: danger + '15', borderColor: danger + '40' }]}>
                <AlertTriangle size={16} color={danger} />
                <Text style={[s.alertText, { color: danger }]}>
                  {report.outOfStockCount} product{report.outOfStockCount !== 1 ? 's' : ''} out of stock
                </Text>
              </View>
            )}

            {/* Stock value */}
            <View style={[s.sectionCard, { backgroundColor: card, borderColor: border }]}>
              <Text style={[s.sectionLabel, { color: muted }]}>Total Stock Value</Text>
              <Text style={[s.sectionValue, { color: text }]}>{formatCurrency(report.totalStockValue)}</Text>
              <Text style={[s.sectionSub, { color: muted }]}>At cost price</Text>
            </View>

            {/* Reorder suggestions */}
            {report.reorderSuggestions.length > 0 && (
              <>
                <Text style={[s.sectionTitle, { color: text }]}>Reorder Suggestions</Text>
                {report.reorderSuggestions.map((p: { productId: string; name: string; currentStock: number; threshold: number; suggestedOrder: number }) => (
                  <View key={p.productId} style={[s.row, { backgroundColor: card, borderColor: border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.rowLabel, { color: text }]} numberOfLines={1}>{p.name}</Text>
                      <Text style={[s.rowSub, { color: muted }]}>
                        Stock: {p.currentStock} / Threshold: {p.threshold}
                      </Text>
                    </View>
                    {p.suggestedOrder > 0 && (
                      <View style={[s.suggestBadge, { backgroundColor: brand + '20' }]}>
                        <Text style={[s.suggestText, { color: brand }]}>Order {p.suggestedOrder}</Text>
                      </View>
                    )}
                  </View>
                ))}
              </>
            )}

            {/* Dead stock */}
            {report.deadStock.length > 0 && (
              <>
                <Text style={[s.sectionTitle, { color: text }]}>
                  Dead Stock ({report.deadStock.length})
                </Text>
                <View style={[s.deadStockNote, { backgroundColor: muted + '15', borderColor: muted + '30' }]}>
                  <Clock size={13} color={muted} />
                  <Text style={[s.deadNoteText, { color: muted }]}>
                    No movement in 30+ days
                  </Text>
                </View>
                {report.deadStock.map((p: { productId: string; name: string; lastMovementDate: string }) => (
                  <View key={p.productId} style={[s.row, { backgroundColor: card, borderColor: border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.rowLabel, { color: text }]} numberOfLines={1}>{p.name}</Text>
                      <Text style={[s.rowSub, { color: muted }]}>
                        Last: {p.lastMovementDate !== 'never'
                          ? new Date(p.lastMovementDate).toLocaleDateString('en-KE')
                          : 'Never'}
                      </Text>
                    </View>
                  </View>
                ))}
              </>
            )}

            {/* Healthy state */}
            {report.deadStock.length === 0 && report.reorderSuggestions.length === 0 && (
              <View style={[s.emptyCard, { backgroundColor: card, borderColor: border }]}>
                <Package size={32} color={success} />
                <Text style={{ color: success, marginTop: 8 }}>Inventory healthy</Text>
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
  kpiValue: { fontSize: 16, fontWeight: '900' },
  alertCard: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, padding: 12, borderWidth: 1, marginBottom: 12 },
  alertText: { fontSize: 13, fontWeight: '700' },
  sectionCard: { borderRadius: 12, padding: 16, borderWidth: 1, marginBottom: 16 },
  sectionLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  sectionValue: { fontSize: 26, fontWeight: '900', marginTop: 4 },
  sectionSub: { fontSize: 11, marginTop: 2 },
  sectionTitle: { fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, padding: 12, borderWidth: 1, marginBottom: 8 },
  rowLabel: { fontSize: 14, fontWeight: '600' },
  rowSub: { fontSize: 11, marginTop: 2 },
  suggestBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  suggestText: { fontSize: 11, fontWeight: '800' },
  deadStockNote: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 8, padding: 8, borderWidth: 1, marginBottom: 8 },
  deadNoteText: { fontSize: 11 },
  emptyCard: { borderRadius: 12, padding: 40, alignItems: 'center', borderWidth: 1 },
})
