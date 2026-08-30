// app/(tabs)/notifications.tsx — Notification Center screen
import React, { useEffect } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native'
import { Bell, BellOff } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNotifications, useLowStockChecker } from '../../src/hooks/useNotifications'
import { useTheme } from '../../src/hooks/useTheme'
import { AppHeader } from '../../src/components/shared/app-header'
import { NotificationItem } from '../../src/components/shared/notification-item'
import type { AppNotification } from '../../src/lib/types'
import { colors, spacing, fontSize } from '../../src/lib/theme'

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets()
  const { bg, card, text, textSecondary, border } = useTheme()
  const { notifications, unreadCount, isLoading, markRead, markAllRead, deleteNotification } = useNotifications()
  const { mutate: checkLowStock } = useLowStockChecker()

  useEffect(() => { checkLowStock() }, [])

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <AppHeader title="Notifications" showSync={false} showToggle={false} showSettings={false} />

      {unreadCount > 0 && (
        <View style={[styles.summary, { backgroundColor: card, borderColor: border }]}>
          <Text style={[styles.summaryText, { color: text }]}>
            {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
          </Text>
          <TouchableOpacity onPress={() => markAllRead()}>
            <Text style={[styles.markAll, { color: colors.brand }]}>Mark all read</Text>
          </TouchableOpacity>
        </View>
      )}

      {notifications.length === 0 ? (
        <View style={styles.empty}>
          <BellOff size={48} color={colors.muted} />
          <Text style={[styles.emptyTitle, { color: text }]}>All caught up</Text>
          <Text style={[styles.emptySub, { color: textSecondary }]}>No notifications yet</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + 80 }}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => checkLowStock()} />}
          renderItem={({ item }) => (
            <NotificationItem
              item={item}
              onMarkRead={() => !item.isRead && markRead(item.id)}
              onDelete={() => deleteNotification(item.id)}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  summaryText: { fontSize: fontSize.sm, fontWeight: '600' },
  markAll: { fontSize: fontSize.sm, fontWeight: '600' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.sm },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: '700', marginTop: spacing.md },
  emptySub: { fontSize: fontSize.sm },
})
