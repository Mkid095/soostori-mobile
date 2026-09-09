// add-employee-modal.tsx — Add employee modal content
import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet, Alert } from 'react-native'
import { useTheme } from '../../hooks/useTheme'
import { createEmployee } from '../../services/db-employees'
import { getDefaultShop } from '../../services/db-shops'
import type { EmployeeRole } from '../../lib/types'

const ROLE_LABELS: Record<EmployeeRole, string> = { owner: 'Owner', manager: 'Manager', attendant: 'Attendant' }
const ROLE_COLORS: Record<EmployeeRole, string> = { owner: '#f97316', manager: '#8b5cf6', attendant: '#22c55e' }

interface Props {
  visible: boolean
  onClose: () => void
  onAdded: () => void
}

export function AddEmployeeModal({ visible, onClose, onAdded }: Props) {
  const theme = useTheme()
  const [newName, setNewName] = useState('')
  const [newPin, setNewPin] = useState('')
  const [newRole, setNewRole] = useState<EmployeeRole>('attendant')
  const [isSaving, setIsSaving] = useState(false)

  async function handleAdd() {
    if (!newName.trim() || newPin.length < 4) { Alert.alert('Error', 'Name and 4-digit PIN are required'); return }
    setIsSaving(true)
    try {
      const shop = await getDefaultShop()
      await createEmployee(shop.id, newName.trim(), newPin, newRole)
      setNewName(''); setNewPin(''); setNewRole('attendant')
      onAdded(); onClose()
    } catch { Alert.alert('Error', 'Failed to add employee') }
    finally { setIsSaving(false) }
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
          <Text style={[styles.modalTitle, { color: theme.text }]}>Add Employee</Text>
          <TextInput style={[styles.input, { backgroundColor: theme.bg, color: theme.text, borderColor: theme.border }]}
            placeholder="Full name" placeholderTextColor={theme.textSecondary} value={newName} onChangeText={setNewName} />
          <TextInput style={[styles.input, { backgroundColor: theme.bg, color: theme.text, borderColor: theme.border }]}
            placeholder="4-digit PIN" placeholderTextColor={theme.textSecondary} value={newPin}
            onChangeText={v => setNewPin(v.replace(/\D/g, '').slice(0, 4))}
            keyboardType="number-pad" maxLength={4} secureTextEntry />
          <Text style={{ color: theme.textSecondary, fontSize: 13, marginBottom: 8 }}>Role</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
            {(['attendant', 'manager'] as EmployeeRole[]).map(role => (
              <TouchableOpacity key={role}
                style={[styles.roleChip, { backgroundColor: newRole === role ? ROLE_COLORS[role] + '20' : theme.bg, borderColor: newRole === role ? ROLE_COLORS[role] : theme.border }]}
                onPress={() => setNewRole(role)}>
                <Text style={{ color: newRole === role ? ROLE_COLORS[role] : theme.textSecondary, fontWeight: '600', fontSize: 13 }}>{ROLE_LABELS[role]}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: theme.bg }]} onPress={onClose}>
              <Text style={{ color: theme.textSecondary }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: theme.brand }]} onPress={handleAdd} disabled={isSaving}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>{isSaving ? 'Saving...' : 'Add'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContent: { width: '100%', maxWidth: 360, borderRadius: 20, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 20 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15, marginBottom: 12 },
  roleChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
})
