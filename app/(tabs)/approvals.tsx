// app/(tabs)/approvals.tsx — Pending device pairing requests + sale conflicts (manager+)
import { useState, useEffect } from 'react'
import { View, Text, FlatList, TouchableOpacity, Alert, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Smartphone, Check, X, Wifi, AlertTriangle, Activity } from 'lucide-react-native'
import { useTheme } from '../../src/hooks/useTheme'
import { AppHeader } from '../../src/components/shared/app-header'
import type { SyncConflict, SaleReconciliationRequiredPayload } from '../../src/lib/sync-protocol'

interface PendingPairing {
  id: string
  deviceId: string
  deviceName: string
  requestedAt: string
}

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

async function loadPendingConflicts(): Promise<SyncConflict[]> {
  try {
    const { getPendingConflicts } = await import('../../src/services/db-conflicts')
    return getPendingConflicts('default')
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

async function resolveConflict(
  conflictId: string,
  resolution: 'PARTIAL_FULFILL' | 'CANCEL',
  partialQuantities?: Record<string, number>,
): Promise<void> {
  const { resolveConflict: dbResolve, applyPartialFulfillment } = await import('../../src/services/db-conflicts')
  await dbResolve(conflictId, resolution, 'owner', partialQuantities)
  if (resolution === 'PARTIAL_FULFILL' && partialQuantities) {
    await applyPartialFulfillment(conflictId, partialQuantities)
  }
}

export default function ApprovalsScreen() {
  const { bg, card, text, textSecondary: textMuted, border, brand, success, danger, warning } = useTheme()
  const [pending, setPending] = useState<PendingPairing[]>([])
  const [conflicts, setConflicts] = useState<SyncConflict[]>([])
  const [resolvingId, setResolvingId] = useState<string | null>(null)

  useEffect(() => {
    loadPendingPairings().then(setPending)
    loadPendingConflicts().then(setConflicts)
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

  async function handleResolve(conflict: SyncConflict, action: 'partial_fulfill' | 'cancel') {
    setResolvingId(conflict.id)
    try {
      if (action === 'partial_fulfill') {
        // Parse payload to get available quantities
        let payload: SaleReconciliationRequiredPayload | null = null
        try {
          payload = JSON.parse(conflict.originalPayload)
        } catch { /* ignore */ }
        // Build partial quantities from available stock
        const partialQuantities: Record<string, number> = {}
        if (payload?.items) {
          for (const item of payload.items) {
            partialQuantities[item.productId] = item.availableQty
          }
        }
        await resolveConflict(conflict.id, 'PARTIAL_FULFILL', partialQuantities)
        Alert.alert('Partial Fulfillment', 'Inventory restored for available stock.')
      } else {
        await resolveConflict(conflict.id, 'CANCEL')
        Alert.alert('Sale Cancelled', 'The conflicting sale has been cancelled.')
      }
      setConflicts((prev) => prev.filter((c) => c.id !== conflict.id))
    } catch {
      Alert.alert('Error', 'Failed to resolve conflict.')
    } finally {
      setResolvingId(null)
    }
  }

  function renderConflictItem(conflict: SyncConflict) {
    let payload: SaleReconciliationRequiredPayload | null = null
    try {
      payload = JSON.parse(conflict.originalPayload)
    } catch { /* ignore */ }
    const isResolving = resolvingId === conflict.id

    return (
      <View key={conflict.id} style={{ backgroundColor: card, borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: border }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: warning + '20', justifyContent: 'center', alignItems: 'center' }}>
            <AlertTriangle size={20} color={warning} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={{ fontWeight: '700', color: text, fontSize: 15 }}>Stock Conflict</Text>
            <Text style={{ color: textMuted, fontSize: 12, marginTop: 2 }}>Sale #{conflict.saleId.slice(0, 8)}…</Text>
          </View>
        </View>

        {payload?.items && (
          <View style={{ marginBottom: 12 }}>
            {payload.items.map((item, i) => (
              <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                <Text style={{ color: text, fontSize: 13 }}>{item.productName}</Text>
                <Text style={{ color: textMuted, fontSize: 13 }}>Requested: {item.requestedQty} / Available: {item.availableQty}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={{ color: textMuted, fontSize: 12, marginBottom: 12 }}>
          Conflict at: {new Date(conflict.createdAt).toLocaleString('en-KE')}
        </Text>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: danger, paddingVertical: 10, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: isResolving ? 0.6 : 1 }}
            onPress={() => handleResolve(conflict, 'cancel')}
            disabled={isResolving}
          >
            {isResolving ? <Activity size={16} color="#fff" /> : <X size={16} color="#fff" />}
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Cancel Sale</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: brand, paddingVertical: 10, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: isResolving ? 0.6 : 1 }}
            onPress={() => handleResolve(conflict, 'partial_fulfill')}
            disabled={isResolving}
          >
            {isResolving ? <Activity size={16} color="#fff" /> : <Check size={16} color="#fff" />}
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Partial Fulfill</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

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
    )
  }

  const hasItems = pending.length > 0 || conflicts.length > 0

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['bottom']}>
      <AppHeader title="Approvals" />
      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 32 }}>

        {conflicts.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <AlertTriangle size={16} color={warning} />
              <Text style={{ fontWeight: '700', color: text, fontSize: 14 }}>Sale Conflicts ({conflicts.length})</Text>
            </View>
            {conflicts.map(renderConflictItem)}
          </View>
        )}

        {conflicts.length > 0 && pending.length > 0 && (
          <View style={{ height: 1, backgroundColor: border, marginVertical: 8 }} />
        )}

        {pending.length > 0 && (
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Smartphone size={16} color={brand} />
              <Text style={{ fontWeight: '700', color: text, fontSize: 14 }}>Device Pairing ({pending.length})</Text>
            </View>
            {pending.map(renderPairingItem)}
          </View>
        )}

        {!hasItems && (
          <View style={{ padding: 60, alignItems: 'center' }}>
            <Check size={48} color={success} />
            <Text style={{ color: text, fontWeight: '700', fontSize: 16, marginTop: 12 }}>All Clear</Text>
            <Text style={{ color: textMuted, fontSize: 13, marginTop: 4 }}>No pending approvals or conflicts</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
