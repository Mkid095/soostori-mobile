// TeamScreenContent.tsx — Phase 14: Team management tab content
import React, { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Users, Mail } from 'lucide-react-native'
import { useTeamMembers } from '../../hooks/useTeamMembers'
import { useTeamInvitations } from '../../hooks/useTeamInvitations'
import { inviteMember, updateMemberRole, removeMember } from '../../services/db-team'
import { InviteModal } from './invite-modal'
import { RolePickerSheet } from './role-picker-sheet'
import { MembersView } from './members-view'
import { InvitationsView } from './invitations-view'
import { teamStyles as s } from './team-styles'
import type { EmployeeRole } from '@soostori/core'

interface Props { businessId: string }

export function TeamScreenContent({ businessId }: Props) {
  const { members, loading: memLoading, error: memErr, canManage } = useTeamMembers()
  const { invitations, loading: invLoading, error: invErr, canManage: invCanManage, cancelInv } =
    useTeamInvitations()

  const [tab, setTab] = useState<'members' | 'invitations'>('members')
  const [showInvite, setShowInvite] = useState(false)
  const [rolePickerMember, setRolePickerMember] = useState<{
    id: string; name: string; role: EmployeeRole
  } | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleInvite(email: string, role: EmployeeRole) {
    await inviteMember(businessId, email, role)
    setShowInvite(false)
  }

  async function handleRoleChange(role: EmployeeRole) {
    if (!rolePickerMember) return
    setBusy(true)
    try {
      await updateMemberRole(rolePickerMember.id, businessId, role)
    } catch (e: unknown) {
      Alert.alert('Update failed', e instanceof Error ? e.message : 'Try again.')
    } finally {
      setBusy(false)
      setRolePickerMember(null)
    }
  }

  async function handleRemove(memberId: string, name: string) {
    Alert.alert('Remove member?', `Remove ${name} from the team?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          setBusy(true)
          try { await removeMember(memberId, businessId) }
          catch (e: unknown) { Alert.alert('Remove failed', e instanceof Error ? e.message : 'Try again.') }
          finally { setBusy(false) }
        },
      },
    ])
  }

  const loading = memLoading || invLoading

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['bottom']}>
      <View style={s.header}>
        <View style={s.headerIcon}><Users size={16} color="#fff" /></View>
        <Text style={s.headerTitle}>Team</Text>
      </View>

      <View style={s.tabRow}>
        {(['members', 'invitations'] as const).map(t => (
          <TouchableOpacity key={t} onPress={() => setTab(t)}
            style={[s.tab, tab === t && s.tabActive]}>
            <Text style={tab === t ? s.tabTextActive : s.tabTextInactive}>
              {t}
              {t === 'invitations' && invitations.length > 0 && (
                <Text style={{ color: tab === t ? '#fff' : '#F97316' }}>
                  {' '}({invitations.length})
                </Text>
              )}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {canManage && tab === 'members' && (
        <TouchableOpacity style={s.fab} onPress={() => setShowInvite(true)}>
          <Mail size={20} color="#fff" />
        </TouchableOpacity>
      )}

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 80 }}>
        {loading ? (
          <View style={s.center}><ActivityIndicator size="large" color="#F97316" /></View>
        ) : tab === 'members' ? (
          <MembersView
            members={members}
            error={memErr}
            canManage={canManage}
            onRolePress={m => setRolePickerMember({ id: m.id, name: m.employeeName, role: m.role })}
            onRemove={handleRemove}
          />
        ) : (
          <InvitationsView
            invitations={invitations}
            error={invErr}
            canManage={invCanManage}
            onCancel={cancelInv}
          />
        )}
      </ScrollView>

      <InviteModal visible={showInvite} onClose={() => setShowInvite(false)} onInvite={handleInvite} />
      <RolePickerSheet
        visible={!!rolePickerMember}
        memberName={rolePickerMember?.name ?? ''}
        currentRole={rolePickerMember?.role ?? 'attendant'}
        onSelect={handleRoleChange}
        onClose={() => setRolePickerMember(null)}
      />
    </SafeAreaView>
  )
}
