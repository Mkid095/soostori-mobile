// StatCard — individual KPI stat card for the reports page
// Pure presentation: no business logic, no API calls.

import { View, Text } from 'react-native'
import { useTheme } from '../../hooks/useTheme'
import { formatCurrency } from '../../lib/formatters'

interface Props {
  label: string
  amount: number
  count: number
  icon: React.ReactNode
  accent: string
}

export function StatCard({ label, amount, count, icon, accent }: Props) {
  const { card, border } = useTheme()
  return (
    <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
      <View style={[styles.iconWrap, { backgroundColor: `${accent}20` }]}>
        {icon}
      </View>
      <Text style={[styles.label, { color: accent }]}>{label}</Text>
      <Text style={[styles.amount, { color: accent }]}>{formatCurrency(amount)}</Text>
      <View style={[styles.badge, { backgroundColor: `${accent}20` }]}>
        <Text style={[styles.badgeText, { color: accent }]}>
          {count} sale{count !== 1 ? 's' : ''}
        </Text>
      </View>
    </View>
  )
}

const styles = {
  card: { width: '47%' as const, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 4 },
  iconWrap: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center' as const, alignItems: 'center' as const, marginBottom: 6 },
  label: { fontSize: 11, fontWeight: '700' as const, textTransform: 'uppercase' as const, marginBottom: 2 },
  amount: { fontSize: 16, fontWeight: '800' as const, marginBottom: 4 },
  badge: { alignSelf: 'flex-start' as const, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeText: { fontSize: 10, fontWeight: '700' as const },
}
