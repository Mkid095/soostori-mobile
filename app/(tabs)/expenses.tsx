// Expenses screen — list expenses grouped by date, filterable, add/edit/delete.
// Business logic in services; component handles UI state + rendering orchestration.

import { useState, useCallback } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '../../src/hooks/useTheme'
import { useExpenses, useMonthlyExpenseTotal } from '../../src/hooks/useExpenses'
import { AppHeader } from '../../src/components/shared/app-header'
import { ExpenseScreenContent } from '../../src/components/expenses/expense-screen-content'

export default function ExpensesScreen() {
  const { bg } = useTheme()
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
      <AppHeader title="Expenses" />
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
