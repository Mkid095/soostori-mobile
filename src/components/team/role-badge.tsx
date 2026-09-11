// RoleBadge.tsx — Phase 14: Role badge for team members
import React from 'react'
import { View, Text } from 'react-native'
import type { EmployeeRole } from '@soostori/core'

const ROLE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  owner:     { label: 'Owner',     bg: '#F97316', text: '#fff' },
  manager:   { label: 'Manager',   bg: '#8B5CF6', text: '#fff' },
  cashier:   { label: 'Cashier',    bg: '#0EA5E9', text: '#fff' },
  attendant: { label: 'Attendant', bg: '#64748B', text: '#fff' },
  viewer:    { label: 'Viewer',    bg: '#94A3B8', text: '#fff' },
}

interface RoleBadgeProps {
  role: EmployeeRole
  size?: 'sm' | 'md'
}

export function RoleBadge({ role, size = 'sm' }: RoleBadgeProps) {
  const cfg = ROLE_CONFIG[role] ?? ROLE_CONFIG.attendant
  return (
    <View style={{
      backgroundColor: cfg.bg + '20',
      borderRadius: 6,
      paddingHorizontal: size === 'sm' ? 6 : 10,
      paddingVertical: size === 'sm' ? 2 : 4,
      borderWidth: 1,
      borderColor: cfg.bg + '40',
    }}>
      <Text style={{
        fontSize: size === 'sm' ? 10 : 12,
        fontWeight: '700',
        color: cfg.bg,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
      }}>
        {cfg.label}
      </Text>
    </View>
  )
}
