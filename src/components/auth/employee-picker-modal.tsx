// EmployeePickerModal — employee selection for PIN login
import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import type { Employee } from '../../lib/sync-protocol'

interface Props {
  employees: Employee[]
  onSelect: (emp: Employee) => void
  onClose: () => void
  theme: { card: string; text: string; textSecondary: string; border: string; brand: string }
}

export function EmployeePickerModal({ employees, onSelect, onClose, theme }: Props) {
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
      <View style={{ backgroundColor: theme.card, borderRadius: 16, padding: 20, width: '100%', maxWidth: 300 }}>
        <Text style={{ fontSize: 16, fontWeight: '800', color: theme.text, marginBottom: 12 }}>Select Employee</Text>
        {employees.map((emp) => (
          <TouchableOpacity key={emp.id} style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border }} onPress={() => onSelect(emp)}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: theme.text }}>{emp.name}</Text>
            <Text style={{ fontSize: 12, color: theme.textSecondary, textTransform: 'capitalize' }}>{emp.role}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={{ marginTop: 12, alignItems: 'center' }} onPress={onClose}>
          <Text style={{ color: theme.brand, fontWeight: '700' }}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
