// Reports page — sales analytics with stats, filters, charts, and sale detail modal
// Business logic in services; UI components are pure presentation.

import { useState, useEffect, useCallback, useMemo } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Receipt, Download } from 'lucide-react-native'
import { useTheme } from '../../src/hooks/useTheme'
import type { Sale } from '../../src/lib/types'
import { getAllSales, getTodaySales, getWeekSales, getMonthSales } from '../../src/services/db-sales'
import { getTotalDebtCollected, getDebtCollectedByDateRange } from '../../src/services/db-debts'
import { formatDate } from '../../src/lib/formatters'
import { ExportModal } from '../../src/components/reports/export-modal'
import { SaleDetailModal } from '../../src/components/reports/sale-detail-modal'
import { SaleRow } from '../../src/components/reports/sale-row'
import { SimpleBarChart } from '../../src/components/reports/simple-bar-chart'
import { StatsSection } from '../../src/components/reports/stats-section'
import { DateFilterRow, PaymentFilterRow } from '../../src/components/reports/filter-row'
import { AppHeader } from '../../src/components/shared/app-header'

type DateFilter = 'today' | 'week' | 'month' | 'all'
type PaymentFilter = 'all' | 'cash' | 'mpesa' | 'debt'

export default function ReportsScreen() {
  const { bg, card, text, textSecondary: textMuted, border, brand } = useTheme()
  const [dateFilter, setDateFilter] = useState<DateFilter>('today')
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all')
  const [allSales, setAllSales] = useState<Sale[]>([])
  const [debtCollected, setDebtCollected] = useState(0)
  const [showExport, setShowExport] = useState(false)
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [detailVisible, setDetailVisible] = useState(false)

  const loadSales = useCallback(async () => {
    let sales: Sale[]
    if (dateFilter === 'today') sales = await getTodaySales()
    else if (dateFilter === 'week') sales = await getWeekSales()
    else if (dateFilter === 'month') sales = await getMonthSales()
    else sales = await getAllSales()
    setAllSales(sales)
  }, [dateFilter])

  const loadDebtCollected = useCallback(async () => {
    const now = new Date()
    if (dateFilter === 'today') {
      const start = new Date(now); start.setHours(0, 0, 0, 0)
      setDebtCollected(await getDebtCollectedByDateRange(start.toISOString(), now.toISOString()))
    } else if (dateFilter === 'week') {
      const diff = (now.getDay() === 0 ? 6 : now.getDay() - 1)
      const monday = new Date(now); monday.setDate(now.getDate() - diff); monday.setHours(0, 0, 0, 0)
      setDebtCollected(await getDebtCollectedByDateRange(monday.toISOString(), now.toISOString()))
    } else if (dateFilter === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
      setDebtCollected(await getDebtCollectedByDateRange(start.toISOString(), now.toISOString()))
    } else {
      setDebtCollected(await getTotalDebtCollected())
    }
  }, [dateFilter])

  useEffect(() => { loadSales() }, [loadSales])
  useEffect(() => { loadDebtCollected() }, [loadDebtCollected])

  const filteredSales = useMemo(() => {
    if (paymentFilter === 'all') return allSales
    if (paymentFilter === 'mpesa') return allSales.filter((s) => s.paymentMethod === 'mpesa' || s.paymentMethod === 'mobile_money')
    return allSales.filter((s) => s.paymentMethod === paymentFilter)
  }, [allSales, paymentFilter])

  const stats = useMemo(() => {
    const cash = filteredSales.filter((s) => s.paymentMethod === 'cash')
    const mpesa = filteredSales.filter((s) => s.paymentMethod === 'mpesa' || s.paymentMethod === 'mobile_money')
    const debt = filteredSales.filter((s) => s.paymentMethod === 'debt')
    return {
      total: { amount: filteredSales.reduce((a, s) => a + s.totalAmount, 0), count: filteredSales.length },
      cash: { amount: cash.reduce((a, s) => a + s.totalAmount, 0), count: cash.length },
      mpesa: { amount: mpesa.reduce((a, s) => a + s.totalAmount, 0), count: mpesa.length },
      debt: { amount: debt.reduce((a, s) => a + s.totalAmount, 0), count: debt.length },
    }
  }, [filteredSales])

  const chartData = useMemo(() => {
    const items = [
      { label: 'Cash', value: stats.cash.amount, color: '#22C55E' },
      { label: 'M-Pesa', value: stats.mpesa.amount, color: '#10B981' },
      { label: 'Debt', value: stats.debt.amount, color: '#F59E0B' },
    ].filter((i) => i.value > 0)
    return { items, max: Math.max(...items.map((i) => i.value), 1) }
  }, [stats])

  const dateRangeLabel = useMemo(() => {
    if (filteredSales.length === 0) return 'No sales'
    const sorted = [...filteredSales].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    const first = sorted[0]; const last = sorted[sorted.length - 1]
    return first.createdAt === last.createdAt ? formatDate(first.createdAt) : `${formatDate(first.createdAt)} – ${formatDate(last.createdAt)}`
  }, [filteredSales])

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['bottom']}>
      <AppHeader title="Sales Reports" />
      <DateFilterRow value={dateFilter} onChange={setDateFilter} />
      <PaymentFilterRow value={paymentFilter} onChange={setPaymentFilter} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 88 }} showsVerticalScrollIndicator={false}>
        <StatsSection stats={stats} debtCollected={debtCollected} dateRangeLabel={dateRangeLabel} />
        {chartData.items.length > 0 && <SimpleBarChart data={chartData.items} maxValue={chartData.max} />}
        <TouchableOpacity onPress={() => setShowExport(true)} style={[s.exportBtn, { backgroundColor: brand }]}>

          <Download size={15} color="#fff" /><Text style={s.exportBtnText}>Export Report</Text>
        </TouchableOpacity>
        <View style={s.listHeader}>
          <Text style={[s.listTitle, { color: text }]}>Transactions</Text>
          <Text style={[s.listCount, { color: textMuted }]}>{filteredSales.length}</Text>
        </View>
        {filteredSales.length === 0 ? (
          <View style={[s.empty, { backgroundColor: card, borderColor: border }]}>

            <Receipt size={32} color={textMuted} /><Text style={[s.emptyText, { color: textMuted }]}>No sales found</Text>
          </View>
        ) : filteredSales.map((sale) => (
          <SaleRow key={sale.id} sale={sale} onPress={() => { setSelectedSale(sale); setDetailVisible(true) }} />
        ))}
      </ScrollView>
      <ExportModal sales={filteredSales} visible={showExport} onClose={() => setShowExport(false)} />
      <SaleDetailModal sale={selectedSale} visible={detailVisible} onClose={() => setDetailVisible(false)} />
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  exportBtn: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 6, marginHorizontal: 12, marginTop: 10, paddingVertical: 12, borderRadius: 10 },
  exportBtnText: { color: '#fff', fontWeight: '800' as const, fontSize: 14 },
  listHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, paddingHorizontal: 12, paddingTop: 16, paddingBottom: 6 },
  listTitle: { fontSize: 15, fontWeight: '800' as const },
  listCount: { fontSize: 13, fontWeight: '600' as const },
  empty: { marginHorizontal: 12, padding: 40, borderRadius: 12, borderWidth: 1, alignItems: 'center' as const, gap: 12 },
  emptyText: { fontSize: 14, fontWeight: '600' as const },
})
