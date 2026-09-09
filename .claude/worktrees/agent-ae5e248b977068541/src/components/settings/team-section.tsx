// team-section.tsx — Employee management in Settings (desktop-agent)
import React, { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, FlatList, TextInput, Modal, StyleSheet, Alert } from 'react-native'
import { Users, Plus, Shield, Trash2, Edit2 } from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import { SettingsSectionCard } from './settings-section-card'
import { listEmployees, createEmployee } from '../../services/db-employees'
import { getDefaultShop } from '../../services/db-shops'
import type { Employee, EmployeeRole } from '../../lib/sync-protocol'

const ROLE_LABELS: Record<EmployeeRole, string> = {
  owner: 'Owner',
  manager: 'Manager',
  attendant: 'Attendant',
}

const ROLE_COLORS: Record<EmployeeRole, string> = {
  owner: '#f97316',
  manager: '#8b5cf6',
  attendant: '#22c55e',
}

export function TeamSection({ onSelect }: { onSelect: () => void }) {
  const theme = useTheme()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPin, setNewPin] = useState('')
  const [newRole, setNewRole] = useState<EmployeeRole>('attendant')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => { loadEmployees() }, [])

  async function loadEmployees() {
    const shop = await getDefaultShop()
    const emps = await listEmployees(shop.id)
    setEmployees(emps)
  }

  async function handleAdd() {
    if (!newName.trim() || newPin.length < 4) {
      Alert.alert('Error', 'Name and 4-digit PIN are required')
      return
    }
    setIsSaving(true)
    try {
      const shop = await getDefaultShop()
      await createEmployee(shop.id, newName.trim(), newPin, newRole)
      setShowAddModal(false)
      setNewName('')
      setNewPin('')
      setNewRole('attendant')
      await loadEmployees()
    } catch (e) {
      Alert.alert('Error', 'Failed to add employee')
    } finally {
      setIsSaving(false)
    }
  }

  const owner = employees.find(e => e.role === 'owner')
  const others = employees.filter(e => e.role !== 'owner')

  return (
    <View style={{ padding: 16 }}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Team Members</Text>

      {owner && (
        <TouchableOpacity style={[styles.employeeRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[styles.avatar, { backgroundColor: ROLE_COLORS.owner + '20' }]}>
            <Shield size={18} color={ROLE_COLORS.owner} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '600', color: theme.text }}>{owner.name}</Text>
            <Text style={{ fontSize: 12, color: theme.textSecondary, textTransform: 'capitalize' }}>{ROLE_LABELS[owner.role]}</Text>
          </View>
        </TouchableOpacity>
      )}

      {others.map(emp => (
        <View key={emp.id} style={[styles.employeeRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[styles.avatar, { backgroundColor: ROLE_COLORS[emp.role] + '20' }]}>
            <Users size={16} color={ROLE_COLORS[emp.role]} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '600', color: theme.text }}>{emp.name}</Text>
            <Text style={{ fontSize: 12, color: theme.textSecondary, textTransform: 'capitalize' }}>{ROLE_LABELS[emp.role]}</Text>
          </View>
        </View>
      ))}

      <TouchableOpacity
        style={[styles.addButton, { backgroundColor: theme.brand + '15' }]}
        onPress={() => setShowAddModal(true)}
      >
        <Plus size={16} color={theme.brand} />
        <Text style={{ color: theme.brand, fontWeight: '600', marginLeft: 6 }}>Add Employee</Text>
      </TouchableOpacity>

      {/* Add employee modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Add Employee</Text>

            <TextInput
              style={[styles.input, { backgroundColor: theme.bg, color: theme.text, borderColor: theme.border }]}
              placeholder="Full name"
              placeholderTextColor={theme.textSecondary}
              value={newName}
              onChangeText={setNewName}
            />

            <TextInput
              style={[styles.input, { backgroundColor: theme.bg, color: theme.text, borderColor: theme.border }]}
              placeholder="4-digit PIN"
              placeholderTextColor={theme.textSecondary}
              value={newPin}
              onChangeText={v => setNewPin(v.replace(/\D/g, '').slice(0, 4))}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
            />

            <Text style={{ color: theme.textSecondary, fontSize: 13, marginBottom: 8 }}>Role</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
              {(['attendant', 'manager'] as EmployeeRole[]).map(role => (
                <TouchableOpacity
                  key={role}
                  style={[styles.roleChip, { backgroundColor: newRole === role ? ROLE_COLORS[role] + '20' : theme.bg, borderColor: newRole === role ? ROLE_COLORS[role] : theme.border }]}
                  onPress={() => setNewRole(role)}
                >
                  <Text style={{ color: newRole === role ? ROLE_COLORS[role] : theme.textSecondary, fontWeight: '600', fontSize: 13 }}>{ROLE_LABELS[role]}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: theme.bg }]} onPress={() => setShowAddModal(false)}>
                <Text style={{ color: theme.textSecondary }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: theme.brand }]} onPress={handleAdd} disabled={isSaving}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>{isSaving ? 'Saving...' : 'Add'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12, marginTop: 8 },
  employeeRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  avatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 12, marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContent: { width: '100%', maxWidth: 360, borderRadius: 20, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 20 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15, marginBottom: 12 },
  roleChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
})
