// MembersView.tsx — Phase 14: Team members list sub-view
import React from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { Users } from 'lucide-react-native'
import { RoleBadge } from './role-badge'
import { teamStyles as s } from './team-styles'
import type { MemberWithEmployee } from '../../services/db-team'

interface Props {
  members: MemberWithEmployee[]
  canManage: boolean
  onRolePress: (m: MemberWithEmployee) => void
  onRemove: (id: string, name: string) => void
}

export function MembersView({ members, canManage, onRolePress, onRemove }: Props) {
  if (members.length === 0) return (
    <View style={s.center}>
      <Users size={40} color="#94A3B8" />
      <Text style={s.emptyTitle}>No team members yet</Text>
      {canManage && <Text style={s.emptySub}>Invite someone to get started</Text>}
    </View>
  )
  return (
    <View style={{ gap: 10 }}>
      {members.map(m => (
        <View key={m.id} style={s.card}>
          <View style={s.memberRow}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>{m.employeeName.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.memberName}>{m.employeeName}</Text>
              {m.employeeEmail && <Text style={s.memberEmail}>{m.employeeEmail}</Text>}
            </View>
            <RoleBadge role={m.role} />
          </View>
          {canManage && (
            <View style={s.actions}>
              <TouchableOpacity style={s.actionBtn} onPress={() => onRolePress(m)}>
                <Text style={s.actionBtnText}>Change role</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.actionBtn, s.actionBtnDanger]}
                onPress={() => onRemove(m.id, m.employeeName)}>
                <Text style={s.actionBtnDangerText}>Remove</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ))}
    </View>
  )
}
