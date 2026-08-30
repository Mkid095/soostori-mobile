// bell-button.tsx — Bell icon with unread badge for app header
import { useState, useEffect, useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { Bell } from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import { getUnreadCount } from '../../services/db-notifications'

export function BellButton() {
  const router = useRouter()
  const { brand, text } = useTheme()
  const [unread, setUnread] = useState(0)

  const load = useCallback(async () => {
    try { setUnread(await getUnreadCount()) } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, 30_000)
    return () => clearInterval(id)
  }, [load])

  return (
    <TouchableOpacity style={s.btn} onPress={() => router.push('/(tabs)/notifications' as any)} activeOpacity={0.7}>
      <Bell size={17} color={unread > 0 ? brand : text} />
      {unread > 0 && (
        <View style={[s.badge, { backgroundColor: brand }]}>
          <Text style={s.badgeText}>{unread > 99 ? '99+' : unread}</Text>
        </View>
      )}
    </TouchableOpacity>
  )
}

const s = StyleSheet.create({
  btn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  badge: {
    position: 'absolute', top: 3, right: 3,
    minWidth: 16, height: 16, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
})
