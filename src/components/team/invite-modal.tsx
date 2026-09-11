// InviteModal.tsx — Phase 14: Invite team member modal
import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, Modal, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { X } from 'lucide-react-native'
import type { EmployeeRole } from '@soostori/core'

const ROLES: EmployeeRole[] = ['manager', 'cashier', 'attendant', 'viewer']

const ROLE_LABELS: Record<EmployeeRole, string> = {
  owner: 'Owner',
  manager: 'Manager',
  cashier: 'Cashier',
  attendant: 'Attendant',
  viewer: 'Viewer',
}

const ROLE_DESCRIPTIONS: Record<EmployeeRole, string> = {
  manager: 'Full access except billing',
  cashier: 'Process sales & payments',
  attendant: 'View inventory & serve customers',
  viewer: 'Read-only access',
}

interface InviteModalProps {
  visible: boolean
  onClose: () => void
  onInvite: (email: string, role: EmployeeRole) => Promise<void>
}

export function InviteModal({ visible, onClose, onInvite }: InviteModalProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<EmployeeRole>('attendant')
  const [loading, setLoading] = useState(false)

  async function handleSend() {
    if (!email.trim()) return
    setLoading(true)
    try {
      await onInvite(email.trim(), role)
      setEmail('')
      setRole('attendant')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
        <View style={{
          flexDirection: 'row', alignItems: 'center', padding: 16,
          borderBottomWidth: 1, borderBottomColor: '#E2E8F0', gap: 10,
        }}>
          <TouchableOpacity onPress={onClose}>
            <X size={20} color="#64748B" />
          </TouchableOpacity>
          <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>
            Invite team member
          </Text>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6 }}>
            Email address
          </Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="colleague@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            style={{
              backgroundColor: '#fff', borderRadius: 10, borderWidth: 1,
              borderColor: '#E2E8F0', paddingHorizontal: 14, paddingVertical: 12,
              fontSize: 15, color: '#0F172A', marginBottom: 20,
            }}
          />

          <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8 }}>
            Role
          </Text>
          <View style={{ gap: 8, marginBottom: 24 }}>
            {ROLES.map(r => (
              <TouchableOpacity
                key={r}
                onPress={() => setRole(r)}
                style={{
                  flexDirection: 'row', alignItems: 'center',
                  padding: 12, borderRadius: 10, borderWidth: 1.5,
                  borderColor: role === r ? '#F97316' : '#E2E8F0',
                  backgroundColor: role === r ? '#FFF7ED' : '#fff',
                }}
              >
                <View style={{
                  width: 18, height: 18, borderRadius: 9,
                  borderWidth: 2, borderColor: role === r ? '#F97316' : '#CBD5E1',
                  backgroundColor: role === r ? '#F97316' : 'transparent',
                  marginRight: 10,
                }} />
                <Text style={{ fontWeight: '600', color: '#0F172A', fontSize: 14 }}>
                  {ROLE_LABELS[r]}
                </Text>
                <Text style={{ marginLeft: 'auto', fontSize: 11, color: '#94A3B8' }}>
                  {ROLE_DESCRIPTIONS[r]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            onPress={handleSend}
            disabled={loading || !email.trim()}
            style={{
              backgroundColor: '#F97316', paddingVertical: 14, borderRadius: 10,
              alignItems: 'center', opacity: loading || !email.trim() ? 0.6 : 1,
            }}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>
                Send invitation
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  )
}
