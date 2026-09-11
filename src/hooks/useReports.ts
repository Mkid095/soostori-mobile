// useReports.ts — React Query hooks for all Phase 13 reports.
// Phase 13

import { useQuery } from '@tanstack/react-query'
import {
  getDashboardSummary,
  getSalesReport,
  getInventoryReport,
  getDebtReport,
  getExpenseReport,
  type DashboardSummary,
  type SalesReport,
  type InventoryReport,
  type DebtReport,
  type ExpenseReport,
} from '../services/db-reports-full'

export function useDashboardSummary() {
  return useQuery<DashboardSummary>({
    queryKey: ['reports', 'dashboard'],
    queryFn: getDashboardSummary,
  })
}

export function useSalesReport(startIso: string, endIso: string) {
  return useQuery<SalesReport>({
    queryKey: ['reports', 'sales', startIso, endIso],
    queryFn: () => getSalesReport(startIso, endIso),
    enabled: !!startIso && !!endIso,
  })
}

export function useInventoryReport() {
  return useQuery<InventoryReport>({
    queryKey: ['reports', 'inventory'],
    queryFn: getInventoryReport,
  })
}

export function useDebtReport() {
  return useQuery<DebtReport>({
    queryKey: ['reports', 'debt'],
    queryFn: getDebtReport,
  })
}

export function useExpenseReport(year: number, month: number) {
  return useQuery<ExpenseReport>({
    queryKey: ['reports', 'expense', year, month],
    queryFn: () => getExpenseReport(year, month),
  })
}
