// PairingListSection — pending device pairing requests list
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native'
import { Smartphone } from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import type { DevicePairing } from '../../lib/sync-protocol'

interface PendingPairing {
  id: string
  deviceId: string
  deviceName: string
  requestedAt: string
}

interface Props {
  pending: PendingPairing[]
  onApprove: (item: PendingPairing) => void
  onReject: (item: PendingPairing) => void
}

export function PairingListSection({ pending, onApprove, onReject }: Props) {
  const { card, text, textSecondary: textMuted, border, brand, success, danger } = useTheme()

  function renderPairingItem(item: PendingPairing) {
    return (
      <View key={item.id} style={{ backgroundColor: card, borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: border }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: brand + '20', justifyContent: 'center', alignItems: 'center' }}>
            <Smartphone size={20} color={brand} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={{ fontWeight: '700', color: text, fontSize: 15 }}>{item.deviceName}</Text>
            <Text style={{ color: textMuted, fontSize: 12, marginTop: 2 }}>ID: {item.deviceId.slice(0, 8)}…</Text>
          </View>
        </View>
        <Text style={{ color: textMuted, fontSize: 12, marginBottom: 12 }}>
          Requested: {new Date(item.requestedAt).toLocaleString('en-KE')}
        </Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: danger, paddingVertical: 10, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            onPress={() => onReject(item)}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: success, paddingVertical: 10, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            onPress={() => onApprove(item)}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Approve</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <Smartphone size={16} color={brand} />
        <Text style={{ fontWeight: '700', color: text, fontSize: 14 }}>Device Pairing ({pending.length})</Text>
      </View>
      {pending.map(renderPairingItem)}
    </View>
  )
}
