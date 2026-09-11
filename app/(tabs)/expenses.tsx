// Expenses screen — list expenses with month selector, FAB to create, report button.
// Phase 12: added status badge, navigate to detail, report button.

import { useState, useCallback } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { TouchableOpacity } from 'react-native'
import { router } from 'expo-router'
import { BarChart2 } from 'lucide-react-native'
import { useTheme } from '../../src/hooks/useTheme'
import { useExpenses, useMonthlyExpenseTotal } from '../../src/hooks/useExpenses'
import { AppHeader } from '../../src/components/shared/app-header'
import { ExpenseScreenContent } from '../../src/components/expenses/expense-screen-content'

export default function ExpensesScreen() {
  const { bg, brand } = useTheme()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [version, setVersion] = useState(0)

  const { data: allExpenses = [], isLoading } = useExpenses()
  const { data: monthlyTotal = 0 } = useMonthlyExpenseTotal(year, month)

  const refresh = useCallback(() => setVersion((v) => v + 1), [])

  function handleMonthSelect(y: number, m: number) {
    setYear(y)
    setMonth(m)
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['bottom']}>
      <AppHeader
        title="Expenses"
        rightAction={
          <TouchableOpacity
            onPress={() => router.push('/expenses/report')}
            activeOpacity={0.7}
            style={{ padding: 6 }}
          >
            <BarChart2 size={20} color={brand} />
          </TouchableOpacity>
        }
      />
      <ExpenseScreenContent
        year={year}
        month={month}
        monthlyTotal={monthlyTotal}
        allExpenses={allExpenses}
        isLoading={isLoading}
        onMonthSelect={handleMonthSelect}
        onRefresh={refresh}
      />
    </SafeAreaView>
  )
}
