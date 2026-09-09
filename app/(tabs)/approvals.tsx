// app/(tabs)/approvals.tsx — Pending device pairing requests + sale conflicts (manager+)
import { useState } from 'react'
import { View, Text, ScrollView, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Check } from 'lucide-react-native'
import { useTheme } from '../../src/hooks/useTheme'
import { AppHeader } from '../../src/components/shared/app-header'
import { useApprovals } from '../../src/hooks/useApprovals'
import { ConflictListSection } from '../../src/components/approvals/conflict-list-section'
import { PairingListSection } from '../../src/components/approvals/pairing-list-section'

export default function ApprovalsScreen() {
  const { bg, text, textSecondary: textMuted, border, success } = useTheme()
  const { pending, conflicts, isLoading, approvePairing, rejectPairing, resolveConflict } = useApprovals()
  const [resolvingId, setResolvingId] = useState<string | null>(null)

  async function handleApprove(item: { id: string; deviceName: string }) {
    await approvePairing(item.id)
    Alert.alert('Approved', `${item.deviceName} has been paired`)
  }

  async function handleReject(item: { id: string; deviceName: string }) {
    Alert.alert('Reject Device', `Are you sure you want to reject "${item.deviceName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject', style: 'destructive',
        onPress: async () => { await rejectPairing(item.id) },
      },
    ])
  }

  async function handleResolve(conflict: import('../../src/lib/sync-protocol').SyncConflict, action: 'partial_fulfill' | 'cancel') {
    setResolvingId(conflict.id)
    try {
      if (action === 'partial_fulfill') {
        const payload = (() => { try { return JSON.parse(conflict.originalPayload) } catch { return null } })()
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
    } catch {
      Alert.alert('Error', 'Failed to resolve conflict.')
    } finally {
      setResolvingId(null)
    }
  }

  const hasItems = pending.length > 0 || conflicts.length > 0

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['bottom']}>
      <AppHeader title="Approvals" />
      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 32 }}>
        {conflicts.length > 0 && (
          <ConflictListSection conflicts={conflicts} resolvingId={resolvingId} onResolve={handleResolve} />
        )}

        {conflicts.length > 0 && pending.length > 0 && (
          <View style={{ height: 1, backgroundColor: border, marginVertical: 8 }} />
        )}

        {pending.length > 0 && (
          <PairingListSection pending={pending} onApprove={handleApprove} onReject={handleReject} />
        )}

        {!hasItems && !isLoading && (
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
