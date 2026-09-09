// React Query hooks for expense categories.

import { useQuery } from '@tanstack/react-query'
import { getAllExpenseCategories } from '../services/db-expense-categories'

export function useExpenseCategories() {
  return useQuery<import('../lib/types').ExpenseCategory[]>({
    queryKey: ['expense-categories'],
    queryFn: getAllExpenseCategories,
  })
}
