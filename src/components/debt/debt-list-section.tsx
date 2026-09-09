// DebtListSection — search + filter + flat list for debts tab
import { useState } from 'react'
import { View, Text, FlatList, TextInput, TouchableOpacity } from 'react-native'
import { Search, FileText } from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import type { Debt } from '../../lib/types'
import { formatCurrency, formatDate } from '../../lib/formatters'

const STATUS_COLORS = { pending: '#F59E0B', partial: '#3B82F6', paid: '#10B981' } as const
type StatusFilter = 'all' | 'pending' | 'partial' | 'paid'

interface DebtCardProps {
  debt: Debt
  onPress: (debt: Debt) => void
  onRecordPayment: (debt: Debt) => void
}

function DebtCard({ debt, onPress, onRecordPayment }: DebtCardProps) {
  const { card, text, textSecondary: textMuted, border } = useTheme()
  const balance = debt.amount - debt.amountPaid
  const statusColor = STATUS_COLORS[debt.status] || STATUS_COLORS.pending
  const paidPercent = debt.amount > 0 ? (debt.amountPaid / debt.amount) * 100 : 0

  return (
    <TouchableOpacity
      style={{ backgroundColor: card, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: border, borderLeftWidth: 4, borderLeftColor: statusColor }}
      onPress={() => onPress(debt)} activeOpacity={0.7}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '700', fontSize: 16, color: text }}>{debt.customerName || 'Unknown'}</Text>
          {debt.customerPhone && <Text style={{ fontSize: 12, color: textMuted, marginTop: 2 }}>{debt.customerPhone}</Text>}
          <Text style={{ fontSize: 11, color: textMuted, marginTop: 4 }}>{formatDate(debt.createdAt)}</Text>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
            <Text style={{ fontSize: 12, color: textMuted }}>Total: <Text style={{ color: text, fontWeight: '700' }}>{formatCurrency(debt.amount)}</Text></Text>
            <Text style={{ fontSize: 12, color: textMuted }}>Paid: <Text style={{ color: '#10B981', fontWeight: '700' }}>{formatCurrency(debt.amountPaid)}</Text></Text>
          </View>
          <View style={{ marginTop: 10, height: 6, borderRadius: 3, backgroundColor: border, overflow: 'hidden' }}>
            <View style={{ height: '100%', width: `${paidPercent}%`, backgroundColor: statusColor, borderRadius: 3 }} />
          </View>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 8, marginLeft: 12 }}>
          <View style={{ backgroundColor: statusColor + '20', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 }}>
            <Text style={{ color: statusColor, fontWeight: '700', fontSize: 11, textTransform: 'capitalize' }}>{debt.status}</Text>
          </View>
          <Text style={{ fontSize: 18, fontWeight: '800', color: balance > 0 ? '#EF4444' : '#10B981' }}>{formatCurrency(balance)}</Text>
        </View>
      </View>
      {debt.status !== 'paid' && (
        <View style={{ marginTop: 12 }}>
          <TouchableOpacity style={{ backgroundColor: '#10B981', borderRadius: 8, paddingVertical: 10, alignItems: 'center' }} onPress={() => onRecordPayment(debt)}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Record Payment</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  )
}

interface Props {
  debts: Debt[]
  onRefresh: () => void
  onRecordPayment: (debt: Debt) => void
  onDebtPress: (debt: Debt) => void
}

export function DebtListSection({ debts, onRefresh, onRecordPayment, onDebtPress }: Props) {
  const { card, text, textSecondary: textMuted, border, brand: orange } = useTheme()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const filters: StatusFilter[] = ['all', 'pending', 'partial', 'paid']

  const filtered = debts.filter((d) => {
    const q = search.toLowerCase()
    const matchesSearch = !q || d.customerName?.toLowerCase().includes(q) || d.customerPhone?.toLowerCase().includes(q)
    const matchesStatus = statusFilter === 'all' || d.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <View style={{ flex: 1 }}>
      <View style={{ padding: 12, gap: 8, borderBottomWidth: 1, borderBottomColor: border, backgroundColor: card }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Search size={16} color={textMuted} />
          <TextInput
            style={{ flex: 1, borderRadius: 10, paddingHorizontal: 4, paddingVertical: 10, fontSize: 15, backgroundColor: 'transparent', color: text }}
            placeholder="Search by name or phone..." placeholderTextColor={textMuted}
            value={search} onChangeText={setSearch}
          />
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {filters.map((f) => (
            <TouchableOpacity
              key={f}
              style={{ flex: 1, borderRadius: 8, paddingVertical: 7, alignItems: 'center', backgroundColor: statusFilter === f ? orange : 'transparent', borderWidth: 1, borderColor: statusFilter === f ? orange : border }}
              onPress={() => setStatusFilter(f)}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: statusFilter === f ? '#fff' : textMuted, textTransform: 'capitalize' }}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 12, paddingBottom: 88 }}
        renderItem={({ item }) => <DebtCard debt={item} onPress={onDebtPress} onRecordPayment={onRecordPayment} />}
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
