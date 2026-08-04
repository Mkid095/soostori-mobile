// FilterRow — date and payment filter controls for the reports page
// Pure presentation: no business logic, no API calls.

import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Banknote, Smartphone, AlertCircle } from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'

type DateFilter = 'today' | 'week' | 'month' | 'all'
type PaymentFilter = 'all' | 'cash' | 'mpesa' | 'debt'

const DATE_LABELS: Record<DateFilter, string> = {
  today: 'Today',
  week: 'This Week',
  month: 'This Month',
  all: 'All Time',
}

const PAYMENT_COLOR: Record<string, string> = {
  cash: '#22C55E',
  mpesa: '#10B981',
  mobile_money: '#10B981',
  debt: '#F59E0B',
}

const PAYMENT_LABEL: Record<string, string> = {
  cash: 'Cash',
  mpesa: 'M-Pesa',
  mobile_money: 'Mobile Money',
  debt: 'Debt',
}

function getPaymentIcon(method: string, color: string) {
  if (method === 'cash') return <Banknote size={14} color={color} />
  if (method === 'mpesa' || method === 'mobile_money') return <Smartphone size={14} color={color} />
  if (method === 'debt') return <AlertCircle size={14} color={color} />
  return null
}

interface DateFilterRowProps {
  value: DateFilter
  onChange: (f: DateFilter) => void
}

export function DateFilterRow({ value, onChange }: DateFilterRowProps) {
  const { card, border, brand, isDark, textSecondary: textMuted } = useTheme()
  return (
    <View style={[styles.dateRow, { backgroundColor: card, borderBottomColor: border }]}>
      {(Object.keys(DATE_LABELS) as DateFilter[]).map((f) => (
        <TouchableOpacity
          key={f}
          onPress={() => onChange(f)}
          style={[
            styles.dateBtn,
            { backgroundColor: value === f ? brand : isDark ? '#0f172a' : '#f1f5f9' },
          ]}
        >
          <Text style={{ color: value === f ? '#fff' : textMuted, fontWeight: '700', fontSize: 12 }}>
            {DATE_LABELS[f]}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}

interface PaymentFilterRowProps {
  value: PaymentFilter
  onChange: (f: PaymentFilter) => void
}

export function PaymentFilterRow({ value, onChange }: PaymentFilterRowProps) {
  const { bg, border, isDark, textSecondary: textMuted } = useTheme()
  return (
    <View style={[styles.payRow, { backgroundColor: bg, borderBottomColor: border }]}>
      {(['all', 'cash', 'mpesa', 'debt'] as PaymentFilter[]).map((f) => {
        const pillAccent = f === 'all' ? '#64748B' : (PAYMENT_COLOR[f] ?? '#64748B')
        return (
          <TouchableOpacity
            key={f}
            onPress={() => onChange(f)}
            style={[
              styles.pill,
              {
                backgroundColor: value === f ? `${pillAccent}20` : isDark ? '#1E293B' : '#f1f5f9',
                borderColor: value === f ? pillAccent : 'transparent',
              },
            ]}
          >
            {f !== 'all' && getPaymentIcon(f === 'mpesa' ? 'mpesa' : f, value === f ? pillAccent : '#94A3B8')}
            <Text style={{ fontSize: 11, fontWeight: '700', color: value === f ? pillAccent : textMuted }}>
              {f === 'all' ? 'All' : f === 'mpesa' ? 'M-Pesa' : PAYMENT_LABEL[f] ?? f}
            </Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  dateRow: { flexDirection: 'row' as const, padding: 8, gap: 6, borderBottomWidth: 1 },
  dateBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' as const },
  payRow: { flexDirection: 'row' as const, paddingHorizontal: 12, paddingVertical: 8, gap: 8, borderBottomWidth: 1 },
  pill: {
    flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1,
  },
})
