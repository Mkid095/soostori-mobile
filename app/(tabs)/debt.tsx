// Debt Management screen — two tab views: Debts list and Customers list
// Business logic in services; component only handles UI state and rendering.

import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Search, Users, FileText, Plus } from 'lucide-react-native'
import { useTheme } from '../../src/hooks/useTheme'
import type { Debt, Customer } from '../../src/lib/types'
import { getAllDebts, getDebtById } from '../../src/services/db-debts'
import { getAllCustomers } from '../../src/services/db-customers'
import { formatCurrency, formatDate } from '../../src/lib/formatters'
import { DebtPartialPaymentModal } from '../../src/components/shared/debt-partial-payment-modal'
import { DebtDetailModal } from '../../src/components/shared/debt-detail-modal'
import { AddCustomerModal } from '../../src/components/shared/add-customer-modal'
import { RecordNewDebtModal } from '../../src/components/shared/record-new-debt-modal'
import { AppHeader } from '../../src/components/shared/app-header'

const STATUS_COLORS = {
  pending: '#F59E0B',
  partial: '#3B82F6',
  paid: '#10B981',
}
type StatusFilter = 'all' | 'pending' | 'partial' | 'paid'

// ─── Debt Card ───────────────────────────────────────────────────────────────

interface DebtCardProps {
  debt: Debt
  onPress: (debt: Debt) => void
  onRecordPayment: (debt: Debt) => void
}

function DebtCard({ debt, onPress, onRecordPayment }: DebtCardProps) {
  const { card, text, textSecondary: textMuted, border, isDark } = useTheme()
  const balance = debt.amount - debt.amountPaid
  const statusColor = STATUS_COLORS[debt.status] || STATUS_COLORS.pending
  const paidPercent = debt.amount > 0 ? (debt.amountPaid / debt.amount) * 100 : 0

  return (
    <TouchableOpacity
      style={{
        backgroundColor: card,
        borderRadius: 12,
        padding: 14,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: border,
        borderLeftWidth: 4,
        borderLeftColor: statusColor,
      }}
      onPress={() => onPress(debt)}
      activeOpacity={0.7}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '700', fontSize: 16, color: text }}>{debt.customerName || 'Unknown'}</Text>
          {debt.customerPhone && (
            <Text style={{ fontSize: 12, color: textMuted, marginTop: 2 }}>{debt.customerPhone}</Text>
          )}
          <Text style={{ fontSize: 11, color: textMuted, marginTop: 4 }}>{formatDate(debt.createdAt)}</Text>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
            <Text style={{ fontSize: 12, color: textMuted }}>
              Total: <Text style={{ color: text, fontWeight: '700' }}>{formatCurrency(debt.amount)}</Text>
            </Text>
            <Text style={{ fontSize: 12, color: textMuted }}>
              Paid: <Text style={{ color: '#10B981', fontWeight: '700' }}>{formatCurrency(debt.amountPaid)}</Text>
            </Text>
          </View>
          {/* Progress bar */}
          <View style={{ marginTop: 10, height: 6, borderRadius: 3, backgroundColor: border, overflow: 'hidden' }}>
            <View style={{ height: '100%', width: `${paidPercent}%`, backgroundColor: statusColor, borderRadius: 3 }} />
          </View>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 8, marginLeft: 12 }}>
          <View
            style={{
              backgroundColor: statusColor + '20',
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 6,
            }}
          >
            <Text style={{ color: statusColor, fontWeight: '700', fontSize: 11, textTransform: 'capitalize' }}>
              {debt.status}
            </Text>
          </View>
          <Text
            style={{
              fontSize: 18,
              fontWeight: '800',
              color: balance > 0 ? '#EF4444' : '#10B981',
            }}
          >
            {formatCurrency(balance)}
          </Text>
        </View>
      </View>

      {debt.status !== 'paid' && (
        <View style={{ marginTop: 12 }}>
          <TouchableOpacity
            style={{
              backgroundColor: '#10B981',
              borderRadius: 8,
              paddingVertical: 10,
              alignItems: 'center',
            }}
            onPress={() => onRecordPayment(debt)}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Record Payment</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  )
}

// ─── Customer Row ─────────────────────────────────────────────────────────────

interface CustomerRowProps {
  customer: Customer
  onRecordDebt: (customer: Customer) => void
}

function CustomerRow({ customer, onRecordDebt }: CustomerRowProps) {
  const { card, text, textSecondary: textMuted, border, brand: orange } = useTheme()

  return (
    <View
      style={{
        backgroundColor: card,
        borderRadius: 12,
        padding: 14,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: border,
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: '700', fontSize: 15, color: text }}>{customer.name}</Text>
        {customer.phone && (
          <Text style={{ fontSize: 12, color: textMuted, marginTop: 2 }}>{customer.phone}</Text>
        )}
        <Text style={{ fontSize: 11, color: textMuted, marginTop: 2 }}>
          Added {formatDate(customer.createdAt)}
        </Text>
      </View>
      <TouchableOpacity
        style={{
          backgroundColor: orange,
          borderRadius: 8,
          paddingHorizontal: 14,
          paddingVertical: 8,
        }}
        onPress={() => onRecordDebt(customer)}
      >
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Record Debt</Text>
      </TouchableOpacity>
    </View>
  )
}

// ─── Debts Tab ────────────────────────────────────────────────────────────────

function DebtsTab({
  debts,
  onRefresh,
  onRecordPayment,
  onDebtPress,
}: {
  debts: Debt[]
  onRefresh: () => void
  onRecordPayment: (debt: Debt) => void
  onDebtPress: (debt: Debt) => void
}) {
  const { bg, card, text, textSecondary: textMuted, border, brand: orange } = useTheme()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const filters: StatusFilter[] = ['all', 'pending', 'partial', 'paid']

  const filtered = debts.filter((d) => {
    const q = search.toLowerCase()
    const matchesSearch =
      !q ||
      d.customerName?.toLowerCase().includes(q) ||
      d.customerPhone?.toLowerCase().includes(q)
    const matchesStatus = statusFilter === 'all' || d.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <View style={{ flex: 1 }}>
      {/* Search */}
      <View style={{ padding: 12, gap: 8, borderBottomWidth: 1, borderBottomColor: border, backgroundColor: card }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>

          <Search size={16} color={textMuted} />
          <TextInput
            style={{
              flex: 1, borderRadius: 10, paddingHorizontal: 4, paddingVertical: 10,
              fontSize: 15, backgroundColor: 'transparent',
              color: text,
            }}
            placeholder="Search by name or phone..."
            placeholderTextColor={textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        {/* Status filters */}
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {filters.map((f) => (
            <TouchableOpacity
              key={f}
              style={{
                flex: 1,
                borderRadius: 8,
                paddingVertical: 7,
                alignItems: 'center',
                backgroundColor: statusFilter === f ? orange : 'transparent',
                borderWidth: 1,
                borderColor: statusFilter === f ? orange : border,
              }}
              onPress={() => setStatusFilter(f)}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: statusFilter === f ? '#fff' : textMuted,
                  textTransform: 'capitalize',
                }}
              >
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 12, paddingBottom: 88 }}
        renderItem={({ item }) => (
          <DebtCard
            debt={item}
            onPress={onDebtPress}
            onRecordPayment={onRecordPayment}
          />
        )}
        ListEmptyComponent={
          <View style={{ padding: 60, alignItems: 'center', gap: 12 }}>

            <FileText size={40} color={textMuted} />
            <Text style={{ color: textMuted, fontSize: 14 }}>No debts found</Text>
          </View>
        }
        onRefresh={onRefresh}
        refreshing={false}
      />
    </View>
  )
}

// ─── Customers Tab ────────────────────────────────────────────────────────────

function CustomersTab({
  customers,
  onRefresh,
  onAddCustomer,
  onRecordDebt,
}: {
  customers: Customer[]
  onRefresh: () => void
  onAddCustomer: () => void
  onRecordDebt: (customer: Customer) => void
}) {
  const { bg, card, text, textSecondary: textMuted, border, border: orange } = useTheme()
  const [search, setSearch] = useState('')

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase()
    return !q || c.name.toLowerCase().includes(q) || c.phone?.toLowerCase().includes(q)
  })

  return (
    <View style={{ flex: 1 }}>
      {/* Search + Add */}
      <View style={{ padding: 12, gap: 8, borderBottomWidth: 1, borderBottomColor: border, backgroundColor: card }}>
        <TextInput
          style={{
            borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
            fontSize: 15, borderWidth: 1, backgroundColor: bg,
            color: text, borderColor: border,
          }}
          placeholder="Search customers..."
          placeholderTextColor={textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {/* Add customer dashed button */}
        <TouchableOpacity
          style={{
            borderRadius: 10,
            paddingVertical: 12,
            alignItems: 'center',
            borderWidth: 2,
            borderColor: orange,
            borderStyle: 'dashed',
          }}
          onPress={onAddCustomer}
        >
          <Text style={{ color: orange, fontWeight: '800', fontSize: 15 }}>+ Add Customer</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 12, paddingBottom: 88 }}
        renderItem={({ item }) => (
          <CustomerRow customer={item} onRecordDebt={onRecordDebt} />
        )}
        ListEmptyComponent={
          <View style={{ padding: 60, alignItems: 'center' }}>
            <Text style={{ color: textMuted }}>No customers found</Text>
          </View>
        }
        onRefresh={onRefresh}
        refreshing={false}
      />
    </View>
  )
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

type Tab = 'debts' | 'customers'

export default function DebtScreen() {
  const { bg, card, text, border, brand: orange } = useTheme()

  const [tab, setTab] = useState<Tab>('debts')
  const [debts, setDebts] = useState<Debt[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])

  // Modal states
  const [partialTarget, setPartialTarget] = useState<Debt | null>(null)
  const [detailDebt, setDetailDebt] = useState<Debt | null>(null)
  const [showAddCustomer, setShowAddCustomer] = useState(false)
  const [recordDebtCustomer, setRecordDebtCustomer] = useState<Customer | null>(null)

  const loadDebts = useCallback(async () => {
    const rows = await getAllDebts()
    setDebts(rows)
  }, [])

  const loadCustomers = useCallback(async () => {
    const rows = await getAllCustomers()
    setCustomers(rows)
  }, [])

  useEffect(() => {
    loadDebts()
    loadCustomers()
  }, [loadDebts, loadCustomers])

  async function handleDebtDetail(debt: Debt) {
    const full = await getDebtById(debt.id)
    if (full) setDetailDebt(full)
  }

  const tabBg = (t: Tab) => (tab === t ? orange : 'transparent')
  const tabColor = (t: Tab) => (tab === t ? '#fff' : text)

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['bottom']}>
      <AppHeader title="Debt Management" />

      {/* Tab switcher */}
      <View
        style={{
          flexDirection: 'row',
          marginHorizontal: 12,
          marginTop: 8,
          borderRadius: 10,
          padding: 4,
          backgroundColor: card,
          borderWidth: 1,
          borderColor: border,
        }}
      >
        {(['debts', 'customers'] as Tab[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={{
              flex: 1,
              borderRadius: 8,
              paddingVertical: 10,
              alignItems: 'center',
              backgroundColor: tabBg(t),
            }}
            onPress={() => setTab(t)}
          >
            <Text style={{ color: tabColor(t), fontWeight: '800', fontSize: 14, textTransform: 'capitalize' }}>
              {t}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'debts' ? (
        <DebtsTab
          debts={debts}
          onRefresh={loadDebts}
          onRecordPayment={setPartialTarget}
          onDebtPress={handleDebtDetail}
        />
      ) : (
        <CustomersTab
          customers={customers}
          onRefresh={loadCustomers}
          onAddCustomer={() => setShowAddCustomer(true)}
          onRecordDebt={setRecordDebtCustomer}
        />
      )}

      {/* Modals */}
      <DebtPartialPaymentModal
        debt={partialTarget}
        onClose={() => setPartialTarget(null)}
        onPaid={loadDebts}
      />

      <DebtDetailModal
        debt={detailDebt}
        onClose={() => setDetailDebt(null)}
        onRecordPayment={setPartialTarget}
      />

      <AddCustomerModal
        visible={showAddCustomer}
        onClose={() => setShowAddCustomer(false)}
        onCreated={loadCustomers}
      />

      <RecordNewDebtModal
        customer={recordDebtCustomer}
        onClose={() => setRecordDebtCustomer(null)}
        onCreated={loadDebts}
      />
    </SafeAreaView>
  )
}
