// lan-sync-section.tsx — LAN client sync status for mobile
// Mobile CANNOT host — only connects to desktop host via ws://<server_ip>:18792/ws
import React, { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native'
import { Wifi, WifiOff, RefreshCw, Plug } from 'lucide-react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useTheme } from '../../hooks/useTheme'
import { lanClient } from '../../services/lan-client'
import { JoinShopSheet } from '../shared/join-shop-sheet'

const SERVER_IP_KEY = '@soostori:serverIp'

export function LanSyncSection() {
  const theme = useTheme()
  const [serverIp, setServerIp] = useState<string | null>(null)
  const [connState, setConnState] = useState<'disconnected' | 'connecting' | 'connected' | 'reconnecting'>('disconnected')
  const [showJoin, setShowJoin] = useState(false)

  useEffect(() => {
    AsyncStorage.getItem(SERVER_IP_KEY).then(setServerIp)
    lanClient.configure({ onConnectionChange: setConnState })
    setConnState(lanClient.isConnected() ? 'connected' : 'disconnected')
  }, [])

  async function handleConnect() {
    if (!serverIp) { setShowJoin(true); return }
    try {
      await lanClient.connect()
    } catch (e) {
      Alert.alert('Connection Failed', 'Could not connect to shop. Check the IP address and try again.')
    }
  }

  function handleDisconnect() {
    lanClient.disconnect()
  }

  const isConnected = connState === 'connected'
  const isConnecting = connState === 'connecting' || connState === 'reconnecting'

  return (
    <View style={{ padding: 16 }}>
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {isConnected
              ? <Wifi size={22} color={theme.brand} />
              : <WifiOff size={22} color={theme.muted} />
            }
            <View style={{ marginLeft: 12 }}>
              <Text style={{ fontWeight: '700', color: theme.text, fontSize: 15 }}>Shop Connection</Text>
              <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                {isConnected ? `Connected to ${serverIp}` : isConnecting ? 'Connecting…' : 'Not connected'}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {isConnecting && <ActivityIndicator size="small" color={theme.brand} />}
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: isConnected ? theme.danger ?? '#ef4444' : theme.brand }]}
              onPress={isConnected ? handleDisconnect : (() => serverIp ? handleConnect() : setShowJoin(true))}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>
                {isConnected ? 'Disconnect' : isConnecting ? '…' : 'Connect'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {isConnected && (
          <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.border }}>
            <Text style={{ fontSize: 12, color: theme.textSecondary }}>
              Sales will be sent to the shop computer for approval. Offline sales are saved locally.
            </Text>
          </View>
        )}

        {!isConnected && !isConnecting && (
          <TouchableOpacity
            style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 6 }}
            onPress={() => setShowJoin(true)}
          >
            <Plug size={14} color={theme.brand} />
            <Text style={{ fontSize: 12, color: theme.brand, fontWeight: '600' }}>Join a shop</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

const styles = {
  card: { borderRadius: 16, padding: 16, borderWidth: 1 },
  header: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const },
  btn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8 },
}
