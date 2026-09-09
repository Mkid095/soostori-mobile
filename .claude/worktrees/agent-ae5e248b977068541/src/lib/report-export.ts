// Report export helpers — pure functions, no side effects

import type { Sale } from '../lib/types'
import { formatCurrency } from './formatters'

export type ExportPeriod = 'today' | 'week' | 'month' | 'year' | 'all'

const periodLabels: Record<ExportPeriod, string> = {
  today: 'Today',
  week: 'This Week',
  month: 'This Month',
  year: 'This Year',
  all: 'All Time',
}

export const periodColors: Record<ExportPeriod, string> = {
  today: '#F97316',
  week: '#3B82F6',
  month: '#22C55E',
  year: '#A855F7',
  all: '#64748B',
}

export function periodLabel(p: ExportPeriod): string {
  return periodLabels[p]
}

function dateKey(v: string): string {
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10)
}

export function filterSalesByPeriod(sales: Sale[], period: ExportPeriod): Sale[] {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (period === 'week') start.setDate(start.getDate() - 6)
  if (period === 'month') start.setDate(1)
  if (period === 'year') start.setMonth(0, 1)
  return sales.filter((s) => {
    const k = dateKey(s.createdAt)
    if (!k) return false
    if (period === 'all') return true
    return new Date(`${k}T00:00:00`) >= start
  })
}

function esc(v: string): string {
  return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function csvEsc(v: string | number): string {
  return `"${String(v).replace(/"/g, '""')}"`
}

export function generateSalesHTML(sales: Sale[], period: ExportPeriod): string {
  const filtered = filterSalesByPeriod(sales, period)
  const total = filtered.reduce((s, sale) => s + sale.totalAmount, 0)
  const rows = filtered.map(
    (s) =>
      `<tr><td>${esc(new Date(s.createdAt).toLocaleString())}</td><td>${esc(s.items_summary ?? '—')}</td><td>${esc(s.paymentMethod)}</td><td style="text-align:right">${formatCurrency(s.totalAmount)}</td></tr>`,
  ).join('')
  return (
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Sales Report</title>` +
    `<style>body{font:14px Arial;color:#172033;padding:28px}h1{margin:0 0 4px}h2{color:#64748b;font-size:12px;font-weight:400;margin:0 0 22px}table{width:100%;border-collapse:collapse;margin-top:22px}th,td{text-align:left;padding:9px 6px;border-bottom:1px solid #e2e8f0}th{font-size:11px;text-transform:uppercase;color:#64748b}.total{text-align:right;font-size:18px;font-weight:bold;margin-top:18px}</style></head>` +
    `<body><h1>Sales Report</h1><h2>${periodLabels[period]} — ${filtered.length} sale${filtered.length !== 1 ? 's' : ''}</h2>` +
    `<table><thead><tr><th>Date</th><th>Items</th><th>Payment</th><th style="text-align:right">Total</th></tr></thead><tbody>${rows}</tbody></table>` +
    `<div class="total">Total: ${formatCurrency(total)}</div></body></html>`
  )
}

export function generateSalesCSV(sales: Sale[], period: ExportPeriod): string {
  const filtered = filterSalesByPeriod(sales, period)
  const rows = filtered.map((s) =>
    [
      new Date(s.createdAt).toLocaleString(),
      s.items_summary ?? '',
      s.subtotal,
      s.discountAmount,
      s.totalAmount,
      s.paymentMethod,
      s.note ?? '',
    ].map(csvEsc).join(','),
  )
  return ['DateTime,Items,Subtotal,Discount,Total,Payment,Note', ...rows].join('\n')
}
