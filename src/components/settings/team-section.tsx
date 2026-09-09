// team-section.tsx — Employee management in Settings
import React, { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Users, Plus, Shield } from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import { listEmployees } from '../../services/db-employees'
import { getDefaultShop } from '../../services/db-shops'
import { AddEmployeeModal } from './add-employee-modal'
import type { Employee, EmployeeRole } from '../../lib/types'

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

  useEffect(() => { loadEmployees() }, [])

  async function loadEmployees() {
    const shop = await getDefaultShop()
    setEmployees(await listEmployees(shop.id))
  }

  const owner = employees.find(e => e.role === 'owner')
  const others = employees.filter(e => e.role !== 'owner')

  return (
    <View style={{ padding: 16 }}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Team Members</Text>
      {owner && (
        <View style={[styles.employeeRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[styles.avatar, { backgroundColor: ROLE_COLORS.owner + '20' }]}>
            <Shield size={18} color={ROLE_COLORS.owner} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '600', color: theme.text }}>{owner.name}</Text>
            <Text style={{ fontSize: 12, color: theme.textSecondary, textTransform: 'capitalize' }}>{ROLE_LABELS[owner.role]}</Text>
          </View>
        </View>
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
      <TouchableOpacity style={[styles.addButton, { backgroundColor: theme.brand + '15' }]} onPress={() => setShowAddModal(true)}>
        <Plus size={16} color={theme.brand} />
        <Text style={{ color: theme.brand, fontWeight: '600', marginLeft: 6 }}>Add Employee</Text>
      </TouchableOpacity>
      <AddEmployeeModal visible={showAddModal} onClose={() => setShowAddModal(false)} onAdded={loadEmployees} />
    </View>
  )
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12, marginTop: 8 },
  employeeRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  avatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 12, marginTop: 4 },
})
