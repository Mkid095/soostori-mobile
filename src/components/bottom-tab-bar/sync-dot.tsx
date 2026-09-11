// SyncDot.tsx — Phase 16 sync status indicator dot for bottom tab bar
// Shows colored badge: green=synced, yellow=pending, red=failed, amber=offline

import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useSyncStatus } from '../../hooks/useSyncStatus'

export function SyncDot() {
  const { pending, failed, isOnline } = useSyncStatus()

  const dotColor =
    !isOnline ? '#F59E0B' :
    failed > 0  ? '#EF4444' :
    pending > 0  ? '#F59E0B' :
    '#22C55E'

  const showDot = !isOnline || failed > 0 || pending > 0

  if (!showDot) return null

  const label = failed > 0 ? `${failed}` : pending > 0 ? `${pending}` : ''

  return (
    <View style={[s.dot, { backgroundColor: dotColor }]}>
      <Text style={s.label}>{label}</Text>
    </View>
  )
}

const s = StyleSheet.create({
  dot: {
    position: 'absolute',
    bottom: 14,
    right: 14,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    zIndex: 102,
  },
  label: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
})
