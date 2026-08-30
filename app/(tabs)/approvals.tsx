// app/(tabs)/approvals.tsx — Pending device pairing requests (manager+)
import { useState, useEffect } from 'react'
import { View, Text, FlatList, TouchableOpacity, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Smartphone, Check, X, Wifi } from 'lucide-react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useTheme } from '../../src/hooks/useTheme'
import { AppHeader } from '../../src/components/shared/app-header'

interface PendingPairing {
  id: string
  deviceId: string
  deviceName: string
  requestedAt: string
}

// In a real implementation, this would be fetched from the local DB
// (device_pairing table updated by LAN sync events from desktop host)
async function loadPendingPairings(): Promise<PendingPairing[]> {
  try {
    const { getDb } = await import('../../src/lib/db')
    const db = await getDb()
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT id, device_id, device_name, created_at FROM device_pairings WHERE status = 'pending' ORDER BY created_at DESC`
    )
    return rows.map((r) => ({
      id: String(r.id),
      deviceId: String(r.device_id),
      deviceName: String(r.device_name ?? 'Unknown Device'),
      requestedAt: String(r.created_at),
    }))
  } catch {
    return []
  }
}

async function approvePairing(id: string): Promise<void> {
  const { getDb } = await import('../../src/lib/db')
  const db = await getDb()
  await db.runAsync(`UPDATE device_pairings SET status = 'approved' WHERE id = ?`, [id])
}

async function rejectPairing(id: string): Promise<void> {
  const { getDb } = await import('../../src/lib/db')
  const db = await getDb()
  await db.runAsync(`UPDATE device_pairings SET status = 'rejected' WHERE id = ?`, [id])
}

export default function ApprovalsScreen() {
  const { bg, card, text, textSecondary: textMuted, border, brand, success, danger } = useTheme()
  const [pending, setPending] = useState<PendingPairing[]>([])

  useEffect(() => {
    loadPendingPairings().then(setPending)
  }, [])

  async function handleApprove(item: PendingPairing) {
    await approvePairing(item.id)
    setPending((prev) => prev.filter((p) => p.id !== item.id))
    Alert.alert('Approved', `${item.deviceName} has been paired`)
  }

  async function handleReject(item: PendingPairing) {
    Alert.alert('Reject Device', `Are you sure you want to reject "${item.deviceName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject', style: 'destructive',
        onPress: async () => {
          await rejectPairing(item.id)
          setPending((prev) => prev.filter((p) => p.id !== item.id))
        },
      },
    ])
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['bottom']}>
      <AppHeader title="Approvals" />

      {/* Connection status */}
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, gap: 8 }}>
        <Wifi size={14} color={textMuted} />
        <Text style={{ color: textMuted, fontSize: 13 }}>Pending device pairing requests</Text>
      </View>

      <FlatList
        data={pending}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 12, paddingBottom: 32 }}
        renderItem={({ item }) => (
          <View style={{ backgroundColor: card, borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: border }}>
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
                onPress={() => handleReject(item)}
              >
                <X size={16} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: success, paddingVertical: 10, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                onPress={() => handleApprove(item)}
              >
                <Check size={16} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Approve</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={{ padding: 60, alignItems: 'center' }}>
            <Check size={48} color={success} />
            <Text style={{ color: text, fontWeight: '700', fontSize: 16, marginTop: 12 }}>All Clear</Text>
            <Text style={{ color: textMuted, fontSize: 13, marginTop: 4 }}>No pending device requests</Text>
          </View>
        }
      />
    </SafeAreaView>
  )
}
