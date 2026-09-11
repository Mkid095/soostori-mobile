// React Query hooks for expenses.
// Phase 12: added approveExpense, markExpensePaid, getExpenseSummaryByCategory

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getAllExpenses,
  getExpensesByDateRange,
  getMonthlyExpenseTotal,
  getExpenseSummaryByCategory,
  createExpense,
  updateExpense,
  approveExpense,
  markExpensePaid,
  deleteExpense,
} from '../services/db-expenses'
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

export interface ExpenseSummary {
  total: number
  byCategory: Record<string, { amount: number; name: string; color: string }>
  pendingCount: number
}

export function useExpenseSummary(year: number, month: number) {
  return useQuery<ExpenseSummary>({
    queryKey: ['expenses', 'summary', year, month],
    queryFn: () => getExpenseSummaryByCategory(year, month),
  })
}

export function useCreateExpense() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
    },
  })
}

export function useUpdateExpense() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateExpense>[1] }) =>
      updateExpense(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
    },
  })
}

export function useApproveExpense() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: approveExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
    },
  })
}

export function useMarkExpensePaid() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: markExpensePaid,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
    },
  })
}

export function useDeleteExpense() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
    },
  })
}
