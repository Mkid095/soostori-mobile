// pairing-requests-sheet.tsx — Approve/reject pending device pairing requests (desktop-agent)
import React, { useEffect } from 'react'
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, StyleSheet } from 'react-native'
import { Smartphone, Check, X, Clock } from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import { usePairings } from '../../hooks/usePairings'
import { getDefaultShop } from '../../services/db-shops'
import type { DevicePairing } from '../../lib/sync-protocol'

interface Props {
  onClose: () => void
}

export function PairingRequestsSheet({ onClose }: Props) {
  const theme = useTheme()
  const [shopId, setShopId] = React.useState('')

  useEffect(() => {
    getDefaultShop().then(s => setShopId(s.id))
  }, [])

  const { pairings, isLoading, refresh, approve, reject } = usePairings(shopId)

  if (!shopId) {
    return (
      <View style={[styles.container, { backgroundColor: theme.card }]}>
        <ActivityIndicator color={theme.brand} />
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.card }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Pairing Requests</Text>
        <TouchableOpacity onPress={onClose}>
          <X size={20} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator color={theme.brand} style={{ marginVertical: 24 }} />
      ) : pairings.length === 0 ? (
        <View style={styles.empty}>
          <Clock size={32} color={theme.muted} />
          <Text style={{ color: theme.textSecondary, marginTop: 8, fontSize: 14 }}>No pending requests</Text>
        </View>
      ) : (
        <FlatList
          data={pairings}
          keyExtractor={item => item.id}
          style={{ maxHeight: 400 }}
          renderItem={({ item }) => (
            <View style={[styles.row, { borderColor: theme.border }]}>
              <View style={[styles.iconWrap, { backgroundColor: theme.brand + '15' }]}>
                <Smartphone size={20} color={theme.brand} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '600', color: theme.text, fontSize: 14 }}>
                  {item.device?.deviceName ?? 'Mobile Device'}
                </Text>
                <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                  {item.device?.deviceType ?? 'mobile'} — {item.createdAt}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  style={[styles.iconBtn, { backgroundColor: theme.brand + '15' }]}
                  onPress={() => approve(item.id, 'owner')}
                >
                  <Check size={16} color={theme.brand} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.iconBtn, { backgroundColor: theme.danger + '15' }]}
                  onPress={() => reject(item.id)}
                >
                  <X size={16} color={theme.danger} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, minHeight: 200 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 17, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: 32 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  iconWrap: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  iconBtn: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
})
