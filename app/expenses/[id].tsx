// app/expenses/[id].tsx — Phase 12: expense detail with approve / mark paid
// Status workflow: pending → approved → paid

import { useState, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ArrowLeft, CheckCircle, DollarSign, Trash2 } from 'lucide-react-native'
import { useTheme } from '../../src/hooks/useTheme'
import type { Expense } from '../../src/lib/types'
import { getExpenseById, deleteExpense } from '../../src/services/db-expenses'
import { formatCurrency, formatDate } from '../../src/lib/formatters'
import { useApproveExpense, useMarkExpensePaid } from '../../src/hooks/useExpenses'

const STATUS_COLORS = {
  pending: '#F59E0B',
  approved: '#3B82F6',
  paid: '#10B981',
} as const

export default function ExpenseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { bg, card, text, muted, border, brand } = useTheme()
  const [expense, setExpense] = useState<Expense | null>(null)
  const [loading, setLoading] = useState(true)

  const approveMutation = useApproveExpense()
  const markPaidMutation = useMarkExpensePaid()

  async function load() {
    if (!id) return
    setLoading(true)
    try {
      const exp = await getExpenseById(id)
      setExpense(exp)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  async function handleApprove() {
    if (!expense) return
    Alert.alert('Approve Expense', `Approve ${formatCurrency(expense.amount)}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        onPress: async () => {
          await approveMutation.mutateAsync(expense!.id)
          await load()
        },
      },
    ])
  }

  async function handleMarkPaid() {
    if (!expense) return
    Alert.alert('Mark as Paid', `Mark ${formatCurrency(expense.amount)} as paid?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Mark Paid',
        onPress: async () => {
          await markPaidMutation.mutateAsync(expense!.id)
          await load()
        },
      },
    ])
  }

  async function handleDelete() {
    if (!expense) return
    Alert.alert('Delete Expense', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteExpense(expense!.id)
          useRouter().back()
        },
      },
    ])
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: muted }}>Loading...</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (!expense) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>
        <View style={[s.header, { backgroundColor: card, borderBottomColor: border }]}>
          <TouchableOpacity onPress={() => useRouter().back()} style={s.backBtn}>
            <ArrowLeft size={20} color={text} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: text }]}>Expense</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: muted }}>Expense not found</Text>
        </View>
      </SafeAreaView>
    )
  }

  const statusColor = STATUS_COLORS[expense.status] ?? STATUS_COLORS.pending
  const canApprove = expense.status === 'pending'
  const canMarkPaid = expense.status === 'pending' || expense.status === 'approved'

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['bottom']}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: card, borderBottomColor: border }]}>
        <TouchableOpacity onPress={() => useRouter().back()} style={s.backBtn}>
          <ArrowLeft size={20} color={text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: text }]}>Expense</Text>
        <TouchableOpacity onPress={handleDelete}>
          <Trash2 size={18} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {/* Amount + status */}
        <View style={[s.amountCard, { backgroundColor: card, borderColor: border }]}>
          <Text style={[s.amount, { color: text }]}>{formatCurrency(expense.amount)}</Text>
          <View style={[s.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[s.statusText, { color: statusColor }]}>{expense.status.toUpperCase()}</Text>
          </View>
        </View>

        {/* Details */}
        <View style={[s.detailCard, { backgroundColor: card, borderColor: border }]}>
          <DetailRow label="Category" value={expense.categoryName || '—'} text={text} muted={muted} />
          <DetailRow label="Date" value={formatDate(expense.date)} text={text} muted={muted} />
          {expense.vendor && <DetailRow label="Vendor" value={expense.vendor} text={text} muted={muted} />}
          {expense.reference && <DetailRow label="Reference" value={expense.reference} text={text} muted={muted} />}
          {expense.description && <DetailRow label="Description" value={expense.description} text={text} muted={muted} />}
          {expense.paidAt && <DetailRow label="Paid At" value={formatDate(expense.paidAt)} text={text} muted={muted} />}
          <DetailRow label="Created" value={formatDate(expense.createdAt)} text={text} muted={muted} />
        </View>

        {/* Action buttons */}
        {(canApprove || canMarkPaid) && (
          <View style={{ marginTop: 16, gap: 12 }}>
            {canApprove && (
              <TouchableOpacity
                style={[s.btn, { backgroundColor: '#3B82F6' }]}
                onPress={handleApprove}
                disabled={approveMutation.isPending}
                activeOpacity={0.85}
              >
                <CheckCircle size={18} color="#fff" />
                <Text style={s.btnText}>{approveMutation.isPending ? 'Approving...' : 'Approve Expense'}</Text>
              </TouchableOpacity>
            )}
            {canMarkPaid && (
              <TouchableOpacity
                style={[s.btn, { backgroundColor: '#10B981' }]}
                onPress={handleMarkPaid}
                disabled={markPaidMutation.isPending}
                activeOpacity={0.85}
              >
                <DollarSign size={18} color="#fff" />
                <Text style={s.btnText}>{markPaidMutation.isPending ? 'Marking Paid...' : 'Mark as Paid'}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function DetailRow({ label, value, text, muted }: { label: string; value: string; text: string; muted: string }) {
  return (
    <View style={s.detailRow}>
      <Text style={[s.detailLabel, { color: muted }]}>{label}</Text>
      <Text style={[s.detailValue, { color: text }]}>{value}</Text>
    </View>
  )
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 14, borderBottomWidth: 1 },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 17, fontWeight: '800' },
  amountCard: { borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 12, borderWidth: 1 },
  amount: { fontSize: 36, fontWeight: '900' },
  statusBadge: { marginTop: 8, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  detailCard: { borderRadius: 16, padding: 16, borderWidth: 1 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB' },
  detailLabel: { fontSize: 13 },
  detailValue: { fontSize: 13, fontWeight: '600', maxWidth: '60%', textAlign: 'right' },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingVertical: 14 },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
})
