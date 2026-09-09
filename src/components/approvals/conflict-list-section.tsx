// ConflictListSection — conflict items with resolve actions
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native'
import { AlertTriangle } from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import type { SyncConflict, SaleReconciliationRequiredPayload } from '../../lib/sync-protocol'

interface Props {
  conflicts: SyncConflict[]
  resolvingId: string | null
  onResolve: (conflict: SyncConflict, action: 'partial_fulfill' | 'cancel') => void
}

export function ConflictListSection({ conflicts, resolvingId, onResolve }: Props) {
  const { card, text, textSecondary: textMuted, border, brand, success, danger, warning } = useTheme()

  function renderConflictItem(conflict: SyncConflict) {
    let payload: SaleReconciliationRequiredPayload | null = null
    try { payload = JSON.parse(conflict.originalPayload) } catch { /* ignore */ }
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
            onPress={() => onResolve(conflict, 'cancel')}
            disabled={isResolving}
          >
            {isResolving ? <ActivityIndicator size={16} color="#fff" /> : null}
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Cancel Sale</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: brand, paddingVertical: 10, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: isResolving ? 0.6 : 1 }}
            onPress={() => onResolve(conflict, 'partial_fulfill')}
            disabled={isResolving}
          >
            {isResolving ? <ActivityIndicator size={16} color="#fff" /> : null}
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Partial Fulfill</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <View style={{ marginBottom: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <AlertTriangle size={16} color={warning} />
        <Text style={{ fontWeight: '700', color: text, fontSize: 14 }}>Sale Conflicts ({conflicts.length})</Text>
      </View>
      {conflicts.map(renderConflictItem)}
    </View>
  )
}
