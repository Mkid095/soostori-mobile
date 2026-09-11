// app/(tabs)/dashboard.tsx — Manager/Owner operational dashboard.
// Phase 12: offline-capable dashboard with clear local/cloud data distinction.
//
// DATA OWNERSHIP:
//   This screen shows LOCAL data only (SQLite). It does NOT query cloud/FIDScript.
//   Local data reflects all POS operations recorded on this device.
//   Cloud data (synced from other devices) appears here only after a sync completes.
//
// OFFLINE BEHAVIOR:
//   When offline, numbers are complete for this device — other devices' unsynced
//   sales are not included. The sync status badge shows when data was last
//   confirmed with the cloud.
//
// RECONCILIATION:
//   Sales total = SUM(completed sales) — derived from local SQLite on every render.
//   Debt indicators = derived from debts table (balance = amount − Σ payments).
//   Sync replay does NOT change displayed totals (idempotency key enforcement).

import { useState, useEffect, useCallback } from 'react'
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { TrendingUp, Package, Users, Clock, ArrowRight, Wifi, WifiOff, Cloud } from 'lucide-react-native'
import { useRouter } from 'expo-router'
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

export default function DashboardScreen() {
  const { bg, card, text, textSecondary: textMuted, border, brand, success, danger } = useTheme()
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
    // Update online status
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
          <Wifi size={13} color={success} />
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

  function SyncNote() {
    if (!syncCtx) return null
    if (syncCtx.lastSyncedAt) {
      const age = Date.now() - new Date(syncCtx.lastSyncedAt).getTime()
      const mins = Math.floor(age / 60_000)
      const hrs = Math.floor(mins / 60)
      const ageLabel = hrs > 0 ? `${hrs}h ago` : mins > 0 ? `${mins}m ago` : 'just now'
      return (
        <Text style={{ fontSize: 10, color: textMuted }}>
          Cloud sync {ageLabel} · {syncCtx.pendingSyncCount} pending
        </Text>
      )
    }
    return (
      <Text style={{ fontSize: 10, color: textMuted }}>
        Never synced to cloud · {syncCtx.pendingSyncCount} pending
      </Text>
    )
  }

  // Derive today's date label
  const todayLabel = new Date().toLocaleDateString('en-KE', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['bottom']}>
      <AppHeader title="Dashboard" rightSlot={<OnlineBadge />} />
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Today's summary — local SQLite only */}
        <View style={{ backgroundColor: brand + '10', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: brand + '30' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: brand, textTransform: 'uppercase', letterSpacing: 0.5 }}>Today — Local</Text>
            <SyncNote />
          </View>
          <Text style={{ fontSize: 12, color: textMuted, marginBottom: 8 }}>{todayLabel}</Text>
          {sales ? (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                <Text style={{ fontWeight: '800', fontSize: 28, color: text }}>
                  {formatCurrency(sales.totalAmount)}
                </Text>
                <Text style={{ color: textMuted, fontSize: 13 }}>
                  · {sales.count} sale{sales.count !== 1 ? 's' : ''}
                </Text>
              </View>
              {/* Payment method breakdown — derived from local sales */}
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                {sales.cashAmount > 0 && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    <Text style={{ fontSize: 11, color: '#22C55E', fontWeight: '700' }}>Cash {formatCurrency(sales.cashAmount)}</Text>
                  </View>
                )}
                {sales.mpesaAmount > 0 && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    <Text style={{ fontSize: 11, color: '#10B981', fontWeight: '700' }}>M-Pesa {formatCurrency(sales.mpesaAmount)}</Text>
                  </View>
                )}
                {sales.debtAmount > 0 && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    <Text style={{ fontSize: 11, color: '#F59E0B', fontWeight: '700' }}>Debt {formatCurrency(sales.debtAmount)}</Text>
                  </View>
                )}
              </View>
            </>
          ) : (
            <Text style={{ color: textMuted, fontSize: 13 }}>Loading...</Text>
          )}
        </View>

        {/* Stat cards row */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {stock ? (
            <>
              <StatCard
                label="Low Stock"
                value={String(stock.lowStockCount)}
                icon={<Package size={20} color={danger} />}
                color={danger}
                sub={stock.outOfStockCount > 0 ? `${stock.outOfStockCount} out` : undefined}
              />
            </>
          ) : (
            <StatCard label="Low Stock" value="—" icon={<Package size={20} color={danger} />} color={danger} />
          )}
          {debt ? (
            <>
              <StatCard
                label="Active Debts"
                value={String(debt.activeDebtCount)}
                icon={<Users size={20} color="#f59e0b" />}
                color="#f59e0b"
                sub={debt.overdueDebtCount > 0 ? `${debt.overdueDebtCount} overdue` : undefined}
              />
            </>
          ) : (
            <StatCard label="Active Debts" value="—" icon={<Users size={20} color="#f59e0b" />} color="#f59e0b" />
          )}
        </View>

        {/* Outstanding debt — local only */}
        {debt && debt.totalOutstanding > 0 && (
          <View style={{ backgroundColor: card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: border }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={{ fontSize: 11, color: textMuted, fontWeight: '600', textTransform: 'uppercase' }}>Total Outstanding</Text>
                <Text style={{ fontSize: 18, fontWeight: '800', color: text, marginTop: 2 }}>
                  {formatCurrency(debt.totalOutstanding)}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 11, color: textMuted, fontWeight: '600', textTransform: 'uppercase' }}>Collected Today</Text>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#A855F7', marginTop: 2 }}>
                  {formatCurrency(debt.collectedToday)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Sync status banner */}
        {syncCtx && (
          <View style={{ backgroundColor: isOnline ? success + '15' : danger + '15', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: isOnline ? success + '30' : danger + '30' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {isOnline ? <Cloud size={14} color={success} /> : <WifiOff size={14} color={danger} />}
              <Text style={{ fontSize: 12, color: isOnline ? success : danger, fontWeight: '600' }}>
                {isOnline ? 'Connected to cloud' : 'Working offline'}
              </Text>
            </View>
            <Text style={{ fontSize: 10, color: textMuted, marginTop: 2, marginLeft: 20 }}>
              {syncCtx.dataFreshnessNote}. {syncCtx.pendingSyncCount > 0 ? `${syncCtx.pendingSyncCount} change${syncCtx.pendingSyncCount !== 1 ? 's' : ''} waiting to sync.` : 'All changes synced.'}
            </Text>
          </View>
        )}

        {/* Quick actions */}
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Quick Actions</Text>

          <TouchableOpacity style={{ backgroundColor: card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: border, flexDirection: 'row', alignItems: 'center' }}
            onPress={() => router.push('/(tabs)/reports')}>
            <TrendingUp size={20} color={brand} />
            <Text style={{ flex: 1, marginLeft: 12, fontWeight: '600', color: text }}>Sales Reports</Text>
            <ArrowRight size={16} color={textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={{ backgroundColor: card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: border, flexDirection: 'row', alignItems: 'center' }}
            onPress={() => router.push('/(tabs)/low-stock' as any)}>
            <Package size={20} color={danger} />
            <Text style={{ flex: 1, marginLeft: 12, fontWeight: '600', color: text }}>Low Stock Items</Text>
            {stock && stock.lowStockCount > 0 && (
              <View style={{ backgroundColor: danger, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, marginRight: 4 }}>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 11 }}>{stock.lowStockCount}</Text>
              </View>
            )}
            <ArrowRight size={16} color={textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={{ backgroundColor: card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: border, flexDirection: 'row', alignItems: 'center' }}
            onPress={() => router.push('/(tabs)/approvals' as any)}>
            <Clock size={20} color={brand} />
            <Text style={{ flex: 1, marginLeft: 12, fontWeight: '600', color: text }}>Pending Approvals</Text>
            <ArrowRight size={16} color={textMuted} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

function StatCard({ label, value, icon, color, sub }: { label: string; value: string; icon: React.ReactElement; color: string; sub?: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: border, alignItems: 'center' }}>
      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: color + '20', justifyContent: 'center', alignItems: 'center', marginBottom: 8 }}>
        {icon}
      </View>
      <Text style={{ fontWeight: '800', fontSize: 20, color: text }}>{value}</Text>
      <Text style={{ color: textMuted, fontSize: 11, marginTop: 2 }}>{label}</Text>
      {sub && <Text style={{ color: danger, fontSize: 10, marginTop: 1 }}>{sub}</Text>}
    </View>
  )
}
