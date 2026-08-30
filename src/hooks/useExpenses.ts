// React Query hooks for expenses.

import { useQuery } from '@tanstack/react-query'
import { getAllExpenses, getExpensesByDateRange, getMonthlyExpenseTotal } from '../services/db-expenses'
import type { Expense } from '../lib/types'

export function useExpenses(filters?: { startDate?: string; endDate?: string; categoryId?: string }) {
  return useQuery<Expense[]>({
    queryKey: ['expenses', filters],
    queryFn: () => {
      if (filters?.startDate && filters?.endDate) {
        return getExpensesByDateRange(filters.startDate, filters.endDate)
      }
      return getAllExpenses()
    },
  })
}

export function useMonthlyExpenseTotal(year: number, month: number) {
  return useQuery<number>({
    queryKey: ['expenses', 'monthly-total', year, month],
    queryFn: () => getMonthlyExpenseTotal(year, month),
  })
}
