// RecordNewDebtModal — record a new debt for an existing customer
// Pure presentation: no business logic, no API calls.

import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, Modal, Alert } from 'react-native'
import { useTheme } from '../../hooks/useTheme'
import type { Customer } from '../../lib/types'
import { createDebt } from '../../services/db-debts'

interface Props {
  customer: Customer | null
  onClose: () => void
  onCreated: () => void
}

export function RecordNewDebtModal({ customer, onClose, onCreated }: Props) {
  const { bg: inputBg, card, text, textSecondary: textMuted, border, success } = useTheme()

  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    if (!customer) return
    const value = parseFloat(amount) || 0
    if (value <= 0) {
      Alert.alert('Invalid', 'Enter a positive debt amount')
      return
    }
    setLoading(true)
    try {
      await createDebt({
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        amount: value,
        notes: note.trim() || undefined,
      })
      setAmount('')
      setNote('')
      onCreated()
      onClose()
    } catch {
      Alert.alert('Error', 'Failed to record debt')
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setAmount('')
    setNote('')
    onClose()
  }

  return (
    <Modal visible={!!customer} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 }}>
        <View style={{ backgroundColor: card, borderRadius: 16, padding: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: text, marginBottom: 4 }}>Record Debt</Text>
          {customer && (
            <Text style={{ fontSize: 12, color: textMuted, marginBottom: 16 }}>
              {customer.name}
              {customer.phone ? ` • ${customer.phone}` : ''}
            </Text>
          )}

          <View style={{ gap: 12 }}>
            <View>
              <Text style={{ fontSize: 12, fontWeight: '700', color: textMuted, marginBottom: 6 }}>Debt Amount (KES) *</Text>
              <TextInput
                style={{
                  borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
                  fontSize: 15, borderWidth: 1, backgroundColor: inputBg,
                  color: text, borderColor: border,
                }}
                placeholder="0.00"
                placeholderTextColor={textMuted}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                autoFocus
              />
            </View>
            <View>
              <Text style={{ fontSize: 12, fontWeight: '700', color: textMuted, marginBottom: 6 }}>Note (optional)</Text>
              <TextInput
                style={{
                  borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
                  fontSize: 15, borderWidth: 1, backgroundColor: inputBg,
                  color: text, borderColor: border,
                }}
                placeholder="What was purchased?"
                placeholderTextColor={textMuted}
                value={note}
                onChangeText={setNote}
                multiline
              />
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 8, marginTop: 20 }}>
            <TouchableOpacity
              style={{
                flex: 1, borderRadius: 10, paddingVertical: 12,
                alignItems: 'center', borderWidth: 1, borderColor: border,
              }}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={{ color: text, fontWeight: '700' }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                flex: 1, backgroundColor: success, borderRadius: 10,
                paddingVertical: 12, alignItems: 'center',
              }}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>{loading ? 'Saving...' : 'Record Debt'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}
