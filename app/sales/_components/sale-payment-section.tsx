// sale-payment-section.tsx — Phase 19: sale payment info + print button
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { CreditCard, Printer } from 'lucide-react-native'
import { formatCurrency } from '../../../src/lib/formatters'

const PM_LABELS: Record<string, string> = {
  cash: 'Cash', mpesa: 'M-Pesa', mobile_money: 'Mobile Money',
  card: 'Card', transfer: 'Transfer', debt: 'Debt',
}

export function SalePaymentSection({ sale }: {
  sale: { paymentMethod: string; paidAmount: number; note?: string }
}) {
  return (
    <>
      <View style={styles.card}>
        <Text style={styles.title}>Payment</Text>
        <View style={styles.row}>
          <View style={styles.iconWrap}>
            <CreditCard size={18} color="#3b82f6" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.method}>
              {PM_LABELS[sale.paymentMethod] ?? sale.paymentMethod}
            </Text>
            {sale.paidAmount > 0 && (
              <Text style={styles.paid}>
                Paid: {formatCurrency(sale.paidAmount)}
              </Text>
            )}
          </View>
        </View>
      </View>

      {sale.note && (
        <View style={styles.card}>
          <Text style={styles.title}>Note</Text>
          <Text style={styles.note}>{sale.note}</Text>
        </View>
      )}

      <TouchableOpacity style={styles.printBtn}>
        <Printer size={18} color="#fff" />
        <Text style={styles.printText}>Print Receipt</Text>
      </TouchableOpacity>
    </>
  )
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, padding: 16, borderWidth: 1, marginBottom: 12 },
  title: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 10, color: '#111827' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.05)', justifyContent: 'center', alignItems: 'center' },
  method: { fontSize: 15, fontWeight: '700', color: '#111827' },
  paid: { fontSize: 13, marginTop: 2, color: '#22c55e' },
  note: { fontSize: 14, lineHeight: 20, color: '#6b7280' },
  printBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 10, backgroundColor: '#3b82f6' },
  printText: { color: '#fff', fontWeight: '800', fontSize: 16 },
})
