import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, Modal, Alert } from 'react-native'
import { X, Banknote, Smartphone } from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import type { Debt } from '../../lib/types'
import { recordDebtPayment } from '../../services/db-debts'
import { formatCurrency } from '../../lib/formatters'

type PaymentMethod = 'cash' | 'mobile_money' | 'card'

interface Props {
  debt: Debt | null
  onClose: () => void
  onPaid: () => void
}

const METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash',
  mobile_money: 'M-Pesa',
  card: 'Card',
}

const METHOD_COLORS: Record<PaymentMethod, string> = {
  cash: '#22c55e',
  mobile_money: '#10B981',
  card: '#3B82F6',
}

export function DebtPartialPaymentModal({ debt, onClose, onPaid }: Props) {
  const { bg: inputBg, card, text, textSecondary: textMuted, border, isDark } = useTheme()

  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('cash')

  async function handleSubmit() {
    if (!debt) return
    const value = parseFloat(amount) || 0
    if (value <= 0) { Alert.alert('Invalid', 'Enter a positive amount'); return }
    const balance = debt.amount - debt.amountPaid
    if (value > balance) { Alert.alert('Too High', `Maximum is ${formatCurrency(balance)}`); return }
    await recordDebtPayment(debt.id, value, method)
    setAmount('')
    setMethod('cash')
    onPaid()
    onClose()
  }

  function handleClose() {
    setAmount('')
    setMethod('cash')
    onClose()
  }

  return (
    <Modal visible={!!debt} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 }}>
        <View style={{ backgroundColor: card, borderRadius: 16, padding: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: text }}>Record Payment</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={8}>
              <X size={20} color={textMuted} />
            </TouchableOpacity>
          </View>
          {debt && (
            <Text style={{ fontSize: 12, color: textMuted, marginBottom: 12 }}>
              {debt.customerName} • Balance: {formatCurrency(debt.amount - debt.amountPaid)}
            </Text>
          )}

          {/* Payment method */}
          <Text style={{ fontSize: 12, fontWeight: '700', color: textMuted, marginBottom: 8 }}>Payment Method</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            {(['cash', 'mobile_money', 'card'] as PaymentMethod[]).map((m) => (
              <TouchableOpacity
                key={m}
                style={{
                  flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center',
                  backgroundColor: method === m ? METHOD_COLORS[m] : isDark ? '#334155' : '#f1f5f9',
                  borderWidth: 1, borderColor: method === m ? 'transparent' : border,
                }}
                onPress={() => setMethod(m)}
              >
                {m === 'cash' ? <Banknote size={18} color={method === m ? '#fff' : textMuted} /> :
                  <Smartphone size={18} color={method === m ? '#fff' : textMuted} />}
                <Text style={{ color: method === m ? '#fff' : text, fontWeight: '700', fontSize: 12, marginTop: 4 }}>
                  {METHOD_LABELS[m]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={{ borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, borderWidth: 1, backgroundColor: inputBg, color: text, borderColor: border, marginBottom: 12 }}
            placeholder="Amount (KES)"
            placeholderTextColor={textMuted}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            autoFocus
          />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={{ flex: 1, backgroundColor: isDark ? '#334155' : '#f1f5f9', borderRadius: 10, paddingVertical: 12, alignItems: 'center' }} onPress={handleClose}>
              <Text style={{ color: text, fontWeight: '700' }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ flex: 1, backgroundColor: '#22c55e', borderRadius: 10, paddingVertical: 12, alignItems: 'center' }} onPress={handleSubmit}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>Record</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}
