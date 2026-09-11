// RolePickerSheet.tsx — Phase 14: Change role action sheet
import React from 'react'
import { View, Text, TouchableOpacity, Modal } from 'react-native'
import { RoleBadge } from './role-badge'
import type { EmployeeRole } from '@soostori/core'

const ROLES: EmployeeRole[] = ['manager', 'cashier', 'attendant', 'viewer']

const ROLE_LABELS: Record<EmployeeRole, string> = {
  owner: 'Owner',
  manager: 'Manager',
  cashier: 'Cashier',
  attendant: 'Attendant',
  viewer: 'Viewer',
}

interface RolePickerSheetProps {
  visible: boolean
  memberName: string
  currentRole: EmployeeRole
  onSelect: (role: EmployeeRole) => void
  onClose: () => void
}

export function RolePickerSheet({
  visible, memberName, currentRole, onSelect, onClose,
}: RolePickerSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}
        activeOpacity={1} onPress={onClose}
      >
        <View style={{
          backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
          padding: 20, paddingBottom: 40,
        }}>
          <Text style={{ fontWeight: '800', fontSize: 16, color: '#0F172A', marginBottom: 16 }}>
            Change role — {memberName}
          </Text>
          {ROLES.map(r => (
            <TouchableOpacity
              key={r}
              onPress={() => onSelect(r)}
              style={{
                flexDirection: 'row', alignItems: 'center',
                paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
              }}
            >
              <RoleBadge role={r} />
              <Text style={{ marginLeft: 12, fontSize: 15, fontWeight: '600', color: '#0F172A' }}>
                {ROLE_LABELS[r]}
              </Text>
              {r === currentRole && (
                <Text style={{ marginLeft: 'auto', color: '#F97316', fontSize: 13, fontWeight: '600' }}>
                  Current
                </Text>
              )}
            </TouchableOpacity>
          ))}
          <TouchableOpacity onPress={onClose} style={{ marginTop: 12, paddingVertical: 12, alignItems: 'center' }}>
            <Text style={{ color: '#EF4444', fontWeight: '600', fontSize: 15 }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  )
}
