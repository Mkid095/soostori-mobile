// AddCustomerModal — form to create a new customer
// Pure presentation: no business logic, no API calls.

import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, Modal, Alert } from 'react-native'
import { useTheme } from '../../hooks/useTheme'
import { createCustomer } from '../../services/db-customers'

interface Props {
  visible: boolean
  onClose: () => void
  onCreated: () => void
}

export function AddCustomerModal({ visible, onClose, onCreated }: Props) {
  const { bg: inputBg, card, text, textSecondary: textMuted, border, success } = useTheme()

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    if (!name.trim()) {
      Alert.alert('Required', 'Customer name is required')
      return
    }
    setLoading(true)
    try {
      await createCustomer({
        name: name.trim(),
        phone: phone.trim() || undefined,
      })
      setName('')
      setPhone('')
      onCreated()
      onClose()
    } catch {
      Alert.alert('Error', 'Failed to create customer')
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setName('')
    setPhone('')
    onClose()
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 }}>
        <View style={{ backgroundColor: card, borderRadius: 16, padding: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: text, marginBottom: 4 }}>Add Customer</Text>
          <Text style={{ fontSize: 12, color: textMuted, marginBottom: 16 }}>
            Create a new customer to track their debts
          </Text>

          <View style={{ gap: 12 }}>
            <View>
              <Text style={{ fontSize: 12, fontWeight: '700', color: textMuted, marginBottom: 6 }}>Name *</Text>
              <TextInput
                style={{
                  borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
                  fontSize: 15, borderWidth: 1, backgroundColor: inputBg,
                  color: text, borderColor: border,
                }}
                placeholder="Full name"
                placeholderTextColor={textMuted}
                value={name}
                onChangeText={setName}
                autoFocus
              />
            </View>
            <View>
              <Text style={{ fontSize: 12, fontWeight: '700', color: textMuted, marginBottom: 6 }}>Phone (optional)</Text>
              <TextInput
                style={{
                  borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
                  fontSize: 15, borderWidth: 1, backgroundColor: inputBg,
                  color: text, borderColor: border,
                }}
                placeholder="+254 700 000 000"
                placeholderTextColor={textMuted}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
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
              <Text style={{ color: '#fff', fontWeight: '700' }}>{loading ? 'Saving...' : 'Add Customer'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}
