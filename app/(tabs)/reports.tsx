// app/(tabs)/reports.tsx — Phase 13: Reports hub with KPI dashboard
// All data from LOCAL SQLite — no cloud mutations needed.

import React from 'react'
import { useState, useCallback, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import {
  TrendingUp, Package, Users, Receipt,
  ArrowRight, WifiOff, Cloud,
  AlertTriangle, Clock,
} from 'lucide-react-native'
import {
  getTodaySalesSummary,
  getStockIndicators,
  getDebtIndicators,
  getSyncReportContext,
  type TodaySalesSummary,
  type StockIndicators,
  type DebtIndicators,
  type SyncReportContext,
} from '../../src/services/db-reports'
import { formatCurrency } from '../../src/lib/formatters'
import { useTheme } from '../../src/hooks/useTheme'
import { AppHeader } from '../../src/components/shared/app-header'
import { cloudPing } from '../../src/services/cloud-sync-api'

type ReportCardDef = {
  title: string
  description: string
  icon: React.ReactElement
  color: string
  route: string
  badge?: number | string
}

export default function ReportsScreen() {
  const { bg, card: cardBg, text, textSecondary: textMuted, border, brand, success, danger } = useTheme()
  const router = useRouter()

  const [sales, setSales] = useState<TodaySalesSummary | null>(null)
  const [stock, setStock] = useState<StockIndicators | null>(null)
  const [debt, setDebt] = useState<DebtIndicators | null>(null)
  const [syncCtx, setSyncCtx] = useState<SyncReportContext | null>(null)
  const [isOnline, setIsOnline] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const loadAll = useCallback(async () => {
    const [s, st, d, ctx] = await Promise.all([
      getTodaySalesSummary(),
      getStockIndicators(),
      getDebtIndicators(),
      getSyncReportContext(),
    ])
    setSales(s)
    setStock(st)
    setDebt(d)
    setSyncCtx(ctx)
    try {
      const ping = await cloudPing()
      setIsOnline(ping.ok)
    } catch {
      setIsOnline(false)
    }
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadAll()
    setRefreshing(false)
  }, [loadAll])

  function OnlineBadge() {
    if (isOnline) {
      return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <WifiOff size={13} color={success} />
          <Text style={{ fontSize: 11, color: success, fontWeight: '700' }}>LIVE</Text>
        </View>
      )
    }
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <WifiOff size={13} color={textMuted} />
        <Text style={{ fontSize: 11, color: textMuted, fontWeight: '700' }}>OFFLINE</Text>
      </View>
    )
  }

  const reportCards: ReportCardDef[] = [
    {
      title: 'Sales Report',
      description: 'Revenue, top products, payment methods',
      icon: <TrendingUp size={22} color={brand} />,
      color: brand,
      route: '/reports/sales',
    },
    {
      title: 'Inventory Report',
      description: 'Stock value, dead stock, reorder suggestions',
      icon: <Package size={22} color="#8B5CF6" />,
      color: '#8B5CF6',
      route: '/reports/inventory',
    },
    {
      title: 'Debt Report',
      description: 'Aging buckets, outstanding by customer',
      icon: <Users size={22} color="#F59E0B" />,
      color: '#F59E0B',
      route: '/reports/debt',
      badge: debt && debt.activeDebtCount > 0 ? debt.activeDebtCount : undefined,
    },
    {
      title: 'Expense Report',
      description: 'Monthly breakdown, category totals',
      icon: <Receipt size={22} color="#10B981" />,
      color: '#10B981',
      route: '/reports/expense',
    },
  ]

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['bottom']}>
      <AppHeader title="Reports" rightAction={<OnlineBadge />} />
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Today summary */}
        <View style={[s.todayCard, { backgroundColor: brand + '10', borderColor: brand + '30' }]}>
          <Text style={[s.todayLabel, { color: brand }]}>
            Today — {new Date().toLocaleDateString('en-KE', { weekday: 'long', month: 'short', day: 'numeric' })}
          </Text>
          {sales ? (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                <Text style={[s.todayAmount, { color: text }]}>
                  {formatCurrency(sales.totalAmount)}
                </Text>
                <Text style={{ color: textMuted, fontSize: 13 }}>
                  {sales.count} sale{sales.count !== 1 ? 's' : ''}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                {sales.cashAmount > 0 && <Text style={{ fontSize: 11, color: '#22C55E', fontWeight: '700' }}>Cash {formatCurrency(sales.cashAmount)}</Text>}
                {sales.mpesaAmount > 0 && <Text style={{ fontSize: 11, color: '#10B981', fontWeight: '700' }}>M-Pesa {formatCurrency(sales.mpesaAmount)}</Text>}
                {sales.debtAmount > 0 && <Text style={{ fontSize: 11, color: '#F59E0B', fontWeight: '700' }}>Debt {formatCurrency(sales.debtAmount)}</Text>}
              </View>
            </>
          ) : (
            <Text style={{ color: textMuted, fontSize: 13 }}>Loading...</Text>
          )}
        </View>

        {/* Alert cards */}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {stock && stock.lowStockCount > 0 && (
            <TouchableOpacity
              style={[s.alertCard, { backgroundColor: danger + '15', borderColor: danger + '30' }]}
              onPress={() => router.push('/reports/inventory' as any)}
            >
              <AlertTriangle size={18} color={danger} />
              <Text style={[s.alertValue, { color: danger }]}>{stock.lowStockCount}</Text>
              <Text style={[s.alertLabel, { color: danger }]}>Low Stock</Text>
              {stock.outOfStockCount > 0 && (
                <Text style={{ fontSize: 10, color: danger }}>{stock.outOfStockCount} out</Text>
              )}
            </TouchableOpacity>
          )}
          {debt && debt.overdueDebtCount > 0 && (
            <TouchableOpacity
              style={[s.alertCard, { backgroundColor: '#F59E0B' + '15', borderColor: '#F59E0B' + '30' }]}
              onPress={() => router.push('/reports/debt' as any)}
            >
              <Clock size={18} color="#F59E0B" />
              <Text style={[s.alertValue, { color: '#F59E0B' }]}>{debt.overdueDebtCount}</Text>
              <Text style={[s.alertLabel, { color: '#F59E0B' }]}>Overdue</Text>
              <Text style={{ fontSize: 10, color: textMuted }}>{formatCurrency(debt.totalOutstanding)} owed</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Outstanding total */}
        {debt && debt.totalOutstanding > 0 && (
          <View style={[s.outstandingCard, { backgroundColor: cardBg, borderColor: border }]}>
            <View style={s.outstandingRow}>
              <View>
                <Text style={[s.outstandingLabel, { color: textMuted }]}>Total Outstanding</Text>
                <Text style={[s.outstandingAmount, { color: text }]}>{formatCurrency(debt.totalOutstanding)}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[s.outstandingLabel, { color: textMuted }]}>Collected Today</Text>
                <Text style={[s.outstandingAmount, { color: '#A855F7' }]}>{formatCurrency(debt.collectedToday)}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Sync status */}
        {syncCtx && (
          <View style={[s.syncCard, { backgroundColor: isOnline ? success + '15' : danger + '15', borderColor: isOnline ? success + '30' : danger + '30' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {isOnline ? <Cloud size={14} color={success} /> : <WifiOff size={14} color={danger} />}
              <Text style={{ fontSize: 12, color: isOnline ? success : danger, fontWeight: '600' }}>
                {isOnline ? 'Connected to cloud' : 'Working offline'}
              </Text>
            </View>
            <Text style={{ fontSize: 10, color: textMuted, marginTop: 2, marginLeft: 20 }}>
              {syncCtx.dataFreshnessNote}. {syncCtx.pendingSyncCount > 0 ? `${syncCtx.pendingSyncCount} changes waiting.` : 'All changes synced.'}
            </Text>
          </View>
        )}

        {/* Report cards */}
        <Text style={[s.sectionTitle, { color: textMuted }]}>All Reports</Text>
        {reportCards.map((item) => (
          <TouchableOpacity
            key={item.route}
            style={[s.reportCard, { backgroundColor: cardBg, borderColor: border }]}
            onPress={() => router.push(item.route as any)}
          >
            <View style={[s.reportIconWrap, { backgroundColor: item.color + '20' }]}>
              {item.icon}
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={[s.reportTitle, { color: text }]}>{item.title}</Text>
                {item.badge !== undefined && (
                  <View style={{ backgroundColor: danger, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 1 }}>
                    <Text style={{ color: '#fff', fontWeight: '900', fontSize: 11 }}>{item.badge}</Text>
                  </View>
                )}
              </View>
              <Text style={[s.reportDesc, { color: textMuted }]}>{item.description}</Text>
            </View>
            <ArrowRight size={18} color={textMuted} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  todayCard: { borderRadius: 14, padding: 16, borderWidth: 1 },
  todayLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  todayAmount: { fontWeight: '800', fontSize: 28 },
  alertCard: { flex: 1, borderRadius: 12, padding: 12, borderWidth: 1, alignItems: 'center' },
  alertValue: { fontSize: 18, fontWeight: '900', marginTop: 4 },
  alertLabel: { fontSize: 11, fontWeight: '600' },
  outstandingCard: { borderRadius: 12, padding: 14, borderWidth: 1 },
  outstandingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  outstandingLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  outstandingAmount: { fontSize: 20, fontWeight: '800', marginTop: 2 },
  syncCard: { borderRadius: 10, padding: 10, borderWidth: 1 },
  sectionTitle: { fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4, marginBottom: 4 },
  reportCard: { borderRadius: 14, padding: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'center' },
  reportIconWrap: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  reportTitle: { fontWeight: '800', fontSize: 15 },
  reportDesc: { fontSize: 12, marginTop: 2 },
})
