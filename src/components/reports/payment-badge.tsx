// PaymentBadge — colored badge showing payment method icon + label
// Pure presentation: no business logic, no API calls.

import { View, Text } from 'react-native'
import { CreditCard, Banknote, Smartphone, AlertCircle, Receipt } from 'lucide-react-native'

const METHOD_ICONS: Record<string, React.ReactNode> = {
  cash: <Banknote size={14} color="#22C55E" />,
  mpesa: <Smartphone size={14} color="#22C55E" />,
  mobile_money: <Smartphone size={14} color="#22C55E" />,
  card: <CreditCard size={14} color="#22C55E" />,
  debt: <AlertCircle size={14} color="#F59E0B" />,
}

const METHOD_COLORS: Record<string, string> = {
  cash: '#22C55E',
  mpesa: '#22C55E',
  mobile_money: '#22C55E',
  card: '#3B82F6',
  debt: '#F59E0B',
}

const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  mpesa: 'M-Pesa',
  mobile_money: 'Mobile Money',
  card: 'Card',
  debt: 'Debt',
}

interface Props {
  method: string
}

export function PaymentBadge({ method }: Props) {
  const color = METHOD_COLORS[method] ?? '#64748B'
  const label = METHOD_LABELS[method] ?? method
  return (
    <View style={[styles.badge, { backgroundColor: `${color}20`, borderColor: color }]}>
      {METHOD_ICONS[method]}
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  )
}

const styles = {
  badge: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  text: { fontSize: 12, fontWeight: '700' as const },
}
