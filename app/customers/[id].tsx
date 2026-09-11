// app/customers/[id].tsx — Customer detail: info + debt history
// Phase 11

import { useState, useEffect, useCallback, type ListRenderItemInfo } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ArrowLeft, Phone, Mail, AlertCircle } from 'lucide-react-native'
import { useTheme } from '../../src/hooks/useTheme'
import type { Customer, Debt } from '../../src/lib/types'
import { getCustomerById } from '../../src/services/db-customers'
import { getDebtsByCustomer, getDebtById } from '../../src/services/db-debts'
import { formatCurrency, formatDate } from '../../src/lib/formatters'
import { DebtDetailModal } from '../../src/components/shared/debt-detail-modal'
import { DebtPartialPaymentModal } from '../../src/components/shared/debt-partial-payment-modal'

const STATUS_COLORS = { pending: '#F59E0B', partial: '#3B82F6', paid: '#10B981' } as const

function DebtRow({ debt, onPress, onRecordPayment }: {
  debt: Debt
  onPress: (d: Debt) => void
  onRecordPayment: (d: Debt) => void
}) {
  const { card, text, textSecondary: textMuted, border } = useTheme()
  const balance = debt.amount - debt.amountPaid
  const statusColor = STATUS_COLORS[debt.status] || STATUS_COLORS.pending

  return (
    <TouchableOpacity
      style={{ backgroundColor: card, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: border, borderLeftWidth: 4, borderLeftColor: statusColor }}
      onPress={() => onPress(debt)}
      activeOpacity={0.7}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, color: textMuted, marginTop: 2 }}>{formatDate(debt.createdAt)}</Text>
          {debt.notes && <Text style={{ fontSize: 12, color: textMuted, marginTop: 2 }} numberOfLines={1}>{debt.notes}</Text>}
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 6 }}>
            <Text style={{ fontSize: 12, color: textMuted }}>Total: <Text style={{ color: text, fontWeight: '700' }}>{formatCurrency(debt.amount)}</Text></Text>
            <Text style={{ fontSize: 12, color: textMuted }}>Paid: <Text style={{ color: '#10B981', fontWeight: '700' }}>{formatCurrency(debt.amountPaid)}</Text></Text>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <View style={{ backgroundColor: statusColor + '20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}>
            <Text style={{ color: statusColor, fontWeight: '700', fontSize: 11, textTransform: 'capitalize' }}>{debt.status}</Text>
          </View>
          <Text style={{ fontSize: 17, fontWeight: '800', color: balance > 0 ? '#EF4444' : '#10B981' }}>{formatCurrency(balance)}</Text>
        </View>
      </View>
      {debt.status !== 'paid' && (
        <TouchableOpacity
          style={{ marginTop: 10, backgroundColor: '#10B981', borderRadius: 8, paddingVertical: 9, alignItems: 'center' }}
          onPress={() => onRecordPayment(debt)}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Record Payment</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  )
}

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { bg, card, text, textSecondary: textMuted, border, brand: orange, success } = useTheme()

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [debts, setDebts] = useState<Debt[]>([])
  const [loading, setLoading] = useState(true)
  const [detailDebt, setDetailDebt] = useState<Debt | null>(null)
  const [paymentTarget, setPaymentTarget] = useState<Debt | null>(null)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const [c, ds] = await Promise.all([
        getCustomerById(id),
        getDebtsByCustomer(id),
      ])
      setCustomer(c)
      setDebts(ds)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  async function handleDebtDetail(debt: Debt) {
    const full = await getDebtById(debt.id)
    if (full) setDetailDebt(full)
  }

  const totalDebt = debts.reduce((s: number, d: Debt) => s + (d.amount - d.amountPaid), 0)
  const activeDebts = debts.filter((d: Debt) => d.status !== 'paid')

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['bottom']}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: card, borderBottomColor: border }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 8, marginRight: 4 }}>
          <ArrowLeft size={20} color={text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: text }]} numberOfLines={1}>
          {customer?.name ?? 'Customer'}
        </Text>
      </View>

      <FlatList
        data={debts}
        keyExtractor={(item: Debt) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshing={loading}
        onRefresh={load}
        ListHeaderComponent={
          <View style={{ gap: 12 }}>
            {/* Contact info */}
            {customer && (
              <View style={[s.infoCard, { backgroundColor: card, borderColor: border }]}>
                {customer.phone && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Phone size={15} color={textMuted} />
                    <Text style={{ color: text, fontSize: 14 }}>{customer.phone}</Text>
                  </View>
                )}
                {customer.email && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Mail size={15} color={textMuted} />
                    <Text style={{ color: text, fontSize: 14 }}>{customer.email}</Text>
                  </View>
                )}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <AlertCircle size={15} color={textMuted} />
                  <Text style={{ color: textMuted, fontSize: 13 }}>Added {formatDate(customer.createdAt)}</Text>
                </View>
              </View>
            )}

            {/* Debt summary */}
            <View style={[s.summaryCard, { backgroundColor: orange + '15', borderColor: orange + '30' }]}>
              <View style={{ flexDirection: 'row', gap: 16 }}>
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ color: textMuted, fontSize: 11, fontWeight: '600' }}>TOTAL OWING</Text>
                  <Text style={{ color: totalDebt > 0 ? '#EF4444' : '#10B981', fontSize: 22, fontWeight: '800', marginTop: 2 }}>
                    {formatCurrency(totalDebt)}
                  </Text>
                </View>
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ color: textMuted, fontSize: 11, fontWeight: '600' }}>ACTIVE DEBTS</Text>
                  <Text style={{ color: orange, fontSize: 22, fontWeight: '800', marginTop: 2 }}>
                    {activeDebts.length}
                  </Text>
                </View>
              </View>
            </View>

            <Text style={{ fontWeight: '800', fontSize: 15, color: text, marginTop: 4 }}>Debt History</Text>
          </View>
        }
        renderItem={({ item }: ListRenderItemInfo<Debt>) => (
          <DebtRow debt={item} onPress={handleDebtDetail} onRecordPayment={setPaymentTarget} />
        )}
        ListEmptyComponent={
          <View style={{ padding: 40, alignItems: 'center', gap: 8 }}>
            <Text style={{ color: textMuted, fontSize: 14 }}>No debts recorded</Text>
          </View>
        }
      />

      {/* Modals */}
      <DebtDetailModal debt={detailDebt} onClose={() => setDetailDebt(null)} onRecordPayment={setPaymentTarget} />
      <DebtPartialPaymentModal debt={paymentTarget} onClose={() => setPaymentTarget(null)} onPaid={load} />
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1 },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '800' },
  infoCard: { borderRadius: 12, padding: 14, borderWidth: 1, gap: 8 },
  summaryCard: { borderRadius: 12, padding: 16, borderWidth: 1 },
})
