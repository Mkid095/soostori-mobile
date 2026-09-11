// InvitationsView.tsx — Phase 14: Team invitations list sub-view
import React from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { Mail, Clock } from 'lucide-react-native'
import { RoleBadge } from './role-badge'
import { teamStyles as s } from './team-styles'
import type { TeamInvitation } from '../../services/db-team'

interface Props {
  invitations: TeamInvitation[]
  canManage: boolean
  onCancel: (id: string) => void
}

export function InvitationsView({ invitations, canManage, onCancel }: Props) {
  if (invitations.length === 0) return (
    <View style={s.center}>
      <Clock size={40} color="#94A3B8" />
      <Text style={s.emptyTitle}>No pending invitations</Text>
    </View>
  )
  return (
    <View style={{ gap: 10 }}>
      {invitations.map(inv => (
        <View key={inv.id} style={s.card}>
          <View style={s.memberRow}>
            <View style={[s.avatar, { backgroundColor: '#FFF7ED' }]}>
              <Mail size={16} color="#F97316" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.memberName}>{inv.email}</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                <RoleBadge role={inv.role} />
                <Text style={{ fontSize: 11, color: '#94A3B8', alignSelf: 'center' }}>
                  Expires {new Date(inv.expiresAt).toLocaleDateString()}
                </Text>
              </View>
            </View>
            {canManage && (
              <TouchableOpacity style={s.iconBtn} onPress={() => onCancel(inv.id)}>
                <Text style={{ color: '#EF4444', fontSize: 12 }}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ))}
    </View>
  )
}
