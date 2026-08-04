// SimpleBarChart — payment method revenue breakdown chart using Views
// Pure presentation: no business logic, no API calls.

import { View, Text } from 'react-native'
import { useTheme } from '../../hooks/useTheme'
import { formatCurrency } from '../../lib/utils'
import { Banknote, Smartphone, AlertCircle, Receipt } from 'lucide-react-native'

interface ChartItem {
  label: string
  value: number
  color: string
}

interface Props {
  data: ChartItem[]
  maxValue: number
}

function getPaymentIcon(method: string, color: string) {
  if (method === 'cash') return <Banknote size={14} color={color} />
  if (method === 'mpesa' || method === 'mobile_money') return <Smartphone size={14} color={color} />
  if (method === 'debt') return <AlertCircle size={14} color={color} />
  return <Receipt size={14} color={color} />
}

export function SimpleBarChart({ data, maxValue }: Props) {
  const { card, border, isDark } = useTheme()
  if (data.length === 0 || maxValue === 0) return null

  return (
    <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
      <Text style={[styles.title, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>
        Revenue by Payment Method
      </Text>
      {data.map((item) => (
        <View key={item.label} style={styles.row}>
          <View style={styles.labelWrap}>
            {getPaymentIcon(item.label.toLowerCase().replace(' ', '_'), item.color)}
            <Text style={[styles.label, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>
              {item.label}
            </Text>
          </View>
          <View style={styles.barWrap}>
            <View style={[styles.barBg, { backgroundColor: isDark ? '#0f172a' : '#f1f5f9' }]}>
              <View style={[styles.bar, { width: `${(item.value / maxValue) * 100}%`, backgroundColor: item.color }]} />
            </View>
            <Text style={[styles.value, { color: isDark ? '#CBD5E1' : '#475569' }]}>
              {formatCurrency(item.value)}
            </Text>
          </View>
        </View>
      ))}
    </View>
  )
}

const styles = {
  card: { marginHorizontal: 12, marginTop: 8, padding: 14, borderRadius: 12, borderWidth: 1 },
  title: { fontSize: 13, fontWeight: '800' as const, marginBottom: 12 },
  row: { flexDirection: 'row' as const, alignItems: 'center' as const, marginBottom: 10 },
  labelWrap: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6, width: 80 },
  label: { fontSize: 12, fontWeight: '600' as const, flex: 1 },
  barWrap: { flex: 1, flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8 },
  barBg: { flex: 1, height: 14, borderRadius: 7, overflow: 'hidden' as const },
  bar: { height: '100%' as const, borderRadius: 7 },
  value: { fontSize: 11, fontWeight: '700' as const, minWidth: 70, textAlign: 'right' as const },
}
