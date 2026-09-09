// ExpenseScreenContent — the scrollable body of the Expenses screen.
// Pure presentation: receives data via props, emits events.

import { useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { Plus, Receipt } from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import type { Expense, ExpenseCategory } from '../../lib/types'
import { useExpenseCategories } from '../../hooks/useExpenseCategories'
import { deleteExpense } from '../../services/db-expenses'
import { formatCurrency, formatDate } from '../../lib/formatters'
import { ExpenseFormModal } from './expense-form-modal'
import { ExpenseRow } from './expense-row'
import { FilterBar, MonthPicker } from './expense-list-header'
import { CategoryPicker } from './expense-category-picker'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

interface Props {
  year: number
  month: number
  monthlyTotal: number
  allExpenses: Expense[]
  isLoading: boolean
  onMonthSelect: (year: number, month: number) => void
  onRefresh: () => void
}

export function ExpenseScreenContent({ year, month, monthlyTotal, allExpenses, isLoading, onMonthSelect, onRefresh }: Props) {
  const { bg, card, text, border, brand } = useTheme()
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editExpense, setEditExpense] = useState<Expense | null>(null)
  const [showMonthPicker, setShowMonthPicker] = useState(false)
  const [showCatPicker, setShowCatPicker] = useState(false)

  const { data: categories = [] } = useExpenseCategories()

  const expenses = selectedCatId ? allExpenses.filter((e) => e.categoryId === selectedCatId) : allExpenses

  const grouped = expenses.reduce<Record<string, Expense[]>>((groups, exp) => {
    const key = exp.date
    if (!groups[key]) groups[key] = []
    groups[key].push(exp)
    return groups
  }, {})

  const sortedGroups = Object.entries(grouped).sort(([a], [b]) => b.localeCompare(a))
  const selectedCatName = selectedCatId ? categories.find((c: ExpenseCategory) => c.id === selectedCatId)?.name ?? null : null
  const monthLabel = `${MONTHS[month - 1]} ${year}`

  function handleExpensePress(exp: Expense) {
    Alert.alert(
      exp.description || exp.categoryName || 'Expense',
      `${formatCurrency(exp.amount)}\n${formatDate(exp.date)}${exp.reference ? `\nRef: ${exp.reference}` : ''}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Edit', onPress: () => { setEditExpense(exp); setShowForm(true) } },
        { text: 'Delete', style: 'destructive', onPress: async () => { await deleteExpense(exp.id); onRefresh() } },
      ]
    )
  }

  return (
    <>
      {/* Monthly total */}
      <View style={[s.totalHeader, { backgroundColor: card, borderBottomColor: border }]}>
        <Text style={[s.totalLabel, { color: brand }]}>{monthLabel} Total</Text>
        <Text style={[s.totalAmount, { color: text }]}>{formatCurrency(monthlyTotal)}</Text>
      </View>

      <FilterBar
        selectedCategoryId={selectedCatId}
        categoryName={selectedCatName}
        onCategoryPress={() => setShowCatPicker(true)}
        onMonthPress={() => setShowMonthPicker(true)}
        monthLabel={monthLabel}
      />

      <FlatList
        data={sortedGroups}
        keyExtractor={([date]) => date}
        contentContainerStyle={{ padding: 12, paddingBottom: 100 }}
        refreshing={isLoading}
        onRefresh={onRefresh}
        renderItem={({ item: [date, exps] }) => (
          <View>
            <Text style={[s.dateHeader, { color: text }]}>{formatDate(date)}</Text>
            {exps.map((exp: Expense) => (
              <ExpenseRow key={exp.id} expense={exp} onPress={handleExpensePress} />
            ))}
          </View>
        )}
        ListEmptyComponent={
          <View style={{ padding: 60, alignItems: 'center', gap: 12 }}>
            <Receipt size={40} color="#94A3B8" />
            <Text style={{ color: '#94A3B8', fontSize: 14 }}>No expenses for {monthLabel}</Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity style={fabStyles.fab} onPress={() => { setEditExpense(null); setShowForm(true) }} activeOpacity={0.85}>
        <Plus size={24} color="#fff" />
      </TouchableOpacity>

      <ExpenseFormModal
        expense={editExpense}
        categories={categories}
        visible={showForm}
        onClose={() => { setShowForm(false); setEditExpense(null) }}
        onSaved={onRefresh}
      />

      <MonthPicker visible={showMonthPicker} year={year} month={month} onSelect={onMonthSelect} onClose={() => setShowMonthPicker(false)} />
      <CategoryPicker visible={showCatPicker} categories={categories} selectedId={selectedCatId} onSelect={setSelectedCatId} onClose={() => setShowCatPicker(false)} />
    </>
  )
}

const s = StyleSheet.create({
  totalHeader: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  totalLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  totalAmount: { fontSize: 30, fontWeight: '800', marginTop: 2 },
  dateHeader: { fontSize: 12, fontWeight: '800', marginBottom: 6, marginTop: 8 },
})

const fabStyles = StyleSheet.create({
  fab: {
    position: 'absolute', bottom: 90, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#F97316',
    justifyContent: 'center', alignItems: 'center',
    elevation: 8, shadowColor: '#F97316', shadowOpacity: 0.4, shadowRadius: 8,
  },
})
