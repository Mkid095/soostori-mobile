// Custom app-wide header — replaces expo-router default headers on all pages
// Contains shop name (left) + quick actions: sync, dark/light toggle, bell, settings (right)

import { useState, useEffect, useCallback, type ReactNode } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { Sun, Moon, Settings, Database, RefreshCw, Building2, ChevronRight } from 'lucide-react-native'
import { useTheme, useAppTheme } from '../../hooks/useTheme'
import { getPendingSyncCount } from '../../services/sync-queue-helper'
import { BellButton } from './bell-button'
import { useActiveBusiness } from '../../hooks/BusinessContext'

interface Props {
  title?: string
  showSync?: boolean
  showToggle?: boolean
  showBell?: boolean
  showSettings?: boolean
  onBusinessSwitch?: () => void
  rightAction?: ReactNode
}

export function AppHeader({ title, showSync = true, showToggle = true, showBell = false, showSettings = true, onBusinessSwitch, rightAction }: Props) {
  const { bg, text, border, brand } = useTheme()
  const { effectiveScheme, toggleScheme } = useAppTheme()
  const router = useRouter()
  const { activeBusiness, openSwitcher } = useActiveBusiness()

  const [pendingSync, setPendingSync] = useState(0)
  const [syncLoading, setSyncLoading] = useState(false)

  const loadPendingSync = useCallback(async () => {
    setSyncLoading(true)
    try {
      const count = await getPendingSyncCount()
      setPendingSync(count)
    } catch { /* ignore */ }
    finally { setSyncLoading(false) }
  }, [])

  useEffect(() => {
    loadPendingSync()
    const id = setInterval(loadPendingSync, 30_000)
    return () => clearInterval(id)
  }, [loadPendingSync])

  function handleSyncTap() {
    loadPendingSync()
    if (pendingSync > 0) {
      Alert.alert('Sync Queue', `${pendingSync} change${pendingSync === 1 ? '' : 's'} waiting to sync.\n\nConnect to your server to upload.`, [{ text: 'OK' }])
    }
  }

  return (
    <View style={[s.container, { backgroundColor: bg, borderBottomWidth: 1, borderBottomColor: border }]}>
      <View style={s.left}>
        {onBusinessSwitch && activeBusiness ? (
          <TouchableOpacity onPress={onBusinessSwitch} activeOpacity={0.7} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: brand + '20', justifyContent: 'center', alignItems: 'center' }}>
              <Building2 size={14} color={brand} />
            </View>
            <Text style={[s.businessName, { color: text }]} numberOfLines={1}>{activeBusiness.businessName}</Text>
            <ChevronRight size={14} color={text} style={{ opacity: 0.6 }} />
          </TouchableOpacity>
        ) : (
          <Text style={[s.title, { color: text }]} numberOfLines={1}>{title || 'Soostori'}</Text>
        )}
      </View>

      {rightAction && <View style={s.rightAction}>{rightAction}</View>}

      <View style={s.right}>
        {showSync && (
          <TouchableOpacity style={s.iconBtn} onPress={handleSyncTap} activeOpacity={0.7}>
            {syncLoading
              ? <RefreshCw size={17} color={text} style={{ opacity: 0.6 }} />
              : <Database size={17} color={pendingSync > 0 ? brand : text} />
            }
            {pendingSync > 0 && (
              <View style={[s.badge, { backgroundColor: brand }]}>
                <Text style={s.badgeText}>{pendingSync > 99 ? '99+' : pendingSync}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {showToggle && (
          <TouchableOpacity style={s.iconBtn} onPress={toggleScheme} activeOpacity={0.7}>
            {effectiveScheme === 'dark' ? <Sun size={17} color={text} /> : <Moon size={17} color={text} />}
          </TouchableOpacity>
        )}

        {showBell && <BellButton />}

        {showSettings && (
          <TouchableOpacity style={s.iconBtn} onPress={() => router.push('/(tabs)/settings')} activeOpacity={0.7}>
            <Settings size={17} color={text} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, minHeight: 52 },
  left: { flex: 1, minWidth: 0 },
  rightAction: { marginRight: 8 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  title: { fontSize: 17, fontWeight: '800' },
  businessName: { fontSize: 15, fontWeight: '700' },
  iconBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  badge: {
    position: 'absolute', top: 3, right: 3,
    minWidth: 16, height: 16, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
})
