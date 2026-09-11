// device-row-component.tsx — Phase 15: Device row card component
import React from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { Smartphone } from 'lucide-react-native'
import type { DeviceType } from '../../lib/sync-protocol'

export interface DeviceRow {
  id: string; shopId: string; employeeId?: string
  deviceName?: string; deviceType: DeviceType
  isHost: boolean; lastSeen?: string; createdAt: string
  status: 'pending' | 'authorized' | 'revoked'
  isPrimary: boolean
}

interface Props {
  device: DeviceRow
  canManage: boolean
  isLocal: boolean
  busy: boolean
  onApprove: (id: string) => void
  onRevoke: (id: string) => void
  onTransferPrimary: (id: string, name?: string) => void
}

export function DeviceRowComponent({
  device,
  canManage,
  isLocal,
  busy,
  onApprove,
  onRevoke,
  onTransferPrimary,
}: Props) {
  const statusColors: Record<string, string> = {
    pending: '#f59e0b',
    authorized: '#22c55e',
    revoked: '#ef4444',
  }
  const color = statusColors[device.status] ?? '#94A3B8'

  return (
    <View style={{ backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', padding: 14, marginBottom: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center' }}>
          <Smartphone size={18} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontWeight: '700', fontSize: 14, color: '#0F172A' }}>
              {device.deviceName ?? `Device ${device.id.slice(0, 6)}`}
            </Text>
            {isLocal && (
              <View style={{ backgroundColor: '#EFF6FF', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 10 }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#3b82f6' }}>This device</Text>
              </View>
            )}
            {device.isPrimary && (
              <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 10 }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#d97706' }}>Primary</Text>
              </View>
            )}
          </View>
          <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
            {device.deviceType} · {device.lastSeen ? `Seen ${new Date(device.lastSeen).toLocaleString()}` : 'Never seen'}
          </Text>
        </View>
        <View style={{ backgroundColor: color + '20', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color }}>{device.status}</Text>
        </View>
      </View>

      {canManage && device.status !== 'revoked' && (
        <View style={{ flexDirection: 'row', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9', gap: 8 }}>
          {device.status === 'pending' && (
            <>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 7, borderRadius: 8, backgroundColor: '#22c55e20', alignItems: 'center' }}
                onPress={() => onApprove(device.id)}
                disabled={busy}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#16a34a' }}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 7, borderRadius: 8, backgroundColor: '#ef444420', alignItems: 'center' }}
                onPress={() => onRevoke(device.id)}
                disabled={busy}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#dc2626' }}>Reject</Text>
              </TouchableOpacity>
            </>
          )}
          {device.status === 'authorized' && !device.isPrimary && (
            <TouchableOpacity
              style={{ flex: 1, paddingVertical: 7, borderRadius: 8, backgroundColor: '#F9731620', alignItems: 'center' }}
              onPress={() => onTransferPrimary(device.id, device.deviceName)}
              disabled={busy}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#F97316' }}>Make Primary</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  )
}
