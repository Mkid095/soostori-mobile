// app/(tabs)/dashboard.tsx — Manager/Owner dashboard: today's sales, low-stock count, pending approvals
import { useState, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { TrendingUp, Package, Users, Clock, ArrowRight } from 'lucide-react-native'
import { useRouter } from 'expo-router'
import { getTodaySales } from '../../src/services/db-sales'
import { getLowStockProducts } from '../../src/services/db-products'
import { getPendingDebtCount } from '../../src/services/db-debts'
import { formatCurrency } from '../../src/lib/formatters'
import { useTheme } from '../../src/hooks/useTheme'
import { AppHeader } from '../../src/components/shared/app-header'
import type { Sale } from '../../src/lib/types'

export default function DashboardScreen() {
  const { bg, card, text, textSecondary: textMuted, border, brand, success, danger } = useTheme()
  const router = useRouter()

  const [todaySales, setTodaySales] = useState<Sale[]>([])
  const [lowStockCount, setLowStockCount] = useState(0)
  const [pendingDebts, setPendingDebts] = useState(0)

  const totalToday = todaySales.reduce((s, sale) => s + sale.totalAmount, 0)
  const countToday = todaySales.length

  useEffect(() => {
    Promise.all([
      getTodaySales(),
      getLowStockProducts(),
      getPendingDebtCount(),
    ]).then(([sales, lowStock, debts]) => {
      setTodaySales(sales)
      setLowStockCount(lowStock.length)
      setPendingDebts(debts)
    })
  }, [])

  function StatCard({ label, value, icon, color }: { label: string; value: string; icon: React.ReactElement; color: string }) {
    return (
      <View style={{ flex: 1, backgroundColor: card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: border, alignItems: 'center' }}>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: color + '20', justifyContent: 'center', alignItems: 'center', marginBottom: 8 }}>
          {icon}
        </View>
        <Text style={{ fontWeight: '800', fontSize: 20, color: text }}>{value}</Text>
        <Text style={{ color: textMuted, fontSize: 11, marginTop: 2 }}>{label}</Text>
      </View>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['bottom']}>
      <AppHeader title="Dashboard" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}>
        {/* Today's summary */}
        <View style={{ backgroundColor: brand + '10', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: brand + '30' }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: brand, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Today</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
            <Text style={{ fontWeight: '800', fontSize: 28, color: text }}>{formatCurrency(totalToday)}</Text>
            <Text style={{ color: textMuted, fontSize: 13 }}>· {countToday} sale{countToday !== 1 ? 's' : ''}</Text>
          </View>
        </View>

        {/* Stat cards row */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <StatCard label="Low Stock" value={String(lowStockCount)} icon={<Package size={20} color={danger} />} color={danger} />
          <StatCard label="Pending Debts" value={String(pendingDebts)} icon={<Users size={20} color="#f59e0b" />} color="#f59e0b" />
        </View>

        {/* Quick actions */}
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Quick Actions</Text>

          <TouchableOpacity style={{ backgroundColor: card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: border, flexDirection: 'row', alignItems: 'center' }}
            onPress={() => router.push('/(tabs)/reports')}>
            <TrendingUp size={20} color={brand} />
            <Text style={{ flex: 1, marginLeft: 12, fontWeight: '600', color: text }}>View Reports</Text>
            <ArrowRight size={16} color={textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={{ backgroundColor: card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: border, flexDirection: 'row', alignItems: 'center' }}
            onPress={() => router.push('/(tabs)/approvals' as any)}>
            <Clock size={20} color={brand} />
            <Text style={{ flex: 1, marginLeft: 12, fontWeight: '600', color: text }}>Pending Approvals</Text>
            <ArrowRight size={16} color={textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={{ backgroundColor: card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: border, flexDirection: 'row', alignItems: 'center' }}
            onPress={() => router.push('/(tabs)/low-stock' as any)}>
            <Package size={20} color={danger} />
            <Text style={{ flex: 1, marginLeft: 12, fontWeight: '600', color: text }}>Low Stock Items</Text>
            {lowStockCount > 0 && (
              <View style={{ backgroundColor: danger, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 }}>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 11 }}>{lowStockCount}</Text>
              </View>
            )}
            <ArrowRight size={16} color={textMuted} style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        </View>

        {/* Recent sales */}
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Recent Sales</Text>
          {todaySales.slice(0, 5).map((sale) => (
            <View key={sale.id} style={{ backgroundColor: card, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: border, flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '600', color: text, fontSize: 14 }}>{sale.items_summary ?? 'Sale'}</Text>
                <Text style={{ color: textMuted, fontSize: 12 }}>{new Date(sale.createdAt).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}</Text>
              </View>
              <Text style={{ fontWeight: '800', color: text }}>{formatCurrency(sale.totalAmount)}</Text>
            </View>
          ))}
          {todaySales.length === 0 && (
            <Text style={{ color: textMuted, textAlign: 'center', paddingVertical: 12 }}>No sales today</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
