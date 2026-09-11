// app/(tabs)/notifications.tsx — Phase 17 Notifications Center with deep linking
//
// Deep linking: tap a notification → navigates to the relevant screen.
// sale.created → Sale detail | debt.payment_recorded → Debt detail | etc.

import React, { useCallback, useState } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl,
} from 'react-native'
import { Bell, BellOff } from 'lucide-react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNotifications, useLowStockChecker } from '../../src/hooks/useNotifications'
import { useTheme } from '../../src/hooks/useTheme'
import { AppHeader } from '../../src/components/shared/app-header'
import { NotificationItem } from '../../src/components/shared/notification-item'
import type { AppNotification } from '../../src/lib/types'
import { colors, spacing, fontSize } from '../../src/lib/theme'
import { eventToDeepLink } from '../../src/services/notifications/expo-push-channel'

const FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Sales', value: 'sale' },
  { label: 'Debt', value: 'debt' },
  { label: 'Inventory', value: 'inventory' },
  { label: 'Team', value: 'team' },
]

function matchesFilter(notif: AppNotification, filter: string): boolean {
  if (filter === 'all') return true
  const et = (notif.data?.eventType as string | undefined) ?? (notif as unknown as Record<string, unknown>).eventType as string | undefined
  return et ? et.startsWith(filter) : false
}

export default function NotificationsScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { bg, card, text, textSecondary, border } = useTheme()
  const { notifications, unreadCount, isLoading, markRead, markAllRead, deleteNotification } =
    useNotifications()
  const { mutate: checkLowStock } = useLowStockChecker()
  const [filter, setFilter] = useState('all')

  const handleNotificationTap = useCallback(
    (item: AppNotification) => {
      if (!item.isRead) markRead(item.id)
      const et = (item.data?.eventType ?? item.type) as string
      const payload = (item.data?.payload ?? item.data ?? {}) as Record<string, unknown>
      const link = eventToDeepLink(et, payload)
      if (link) {
        const screen = link.screen.replace('/(tabs)/', '')
        router.push({ pathname: `/${screen}`, params: link.params as Record<string, string> } as never)
      } else {
        router.push('/notifications' as never)
      }
    },
    [markRead, router],
  )

  const filtered = notifications.filter((n: AppNotification) => matchesFilter(n, filter))

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <AppHeader title="Notifications" showSync={false} showToggle={false} showSettings={false} />

      {/* Unread summary + mark-all */}
      {unreadCount > 0 && (
        <View style={[styles.summary, { backgroundColor: card, borderColor: border }]}>
          <Text style={[styles.summaryText, { color: text }]}>
            {unreadCount} unread
          </Text>
          <TouchableOpacity onPress={() => markAllRead()}>
            <Text style={[styles.markAll, { color: colors.brand }]}>Mark all read</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Filter bar */}
      <View style={[styles.filterBar, { borderColor: border }]}>
        <FlatList
          horizontal
          data={FILTERS}
          keyExtractor={(f: typeof FILTERS[0]) => f.value}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: spacing.md }}
          renderItem={({ item }: { item: typeof FILTERS[0] }) => (
            <TouchableOpacity
              style={[
                styles.filterChip,
                { backgroundColor: filter === item.value ? colors.brand : 'transparent', borderColor: border },
              ]}
              onPress={() => setFilter(item.value)}
            >
              <Text
                style={[
                  styles.filterLabel,
                  { color: filter === item.value ? '#fff' : textSecondary },
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <BellOff size={48} color={colors.muted} />
          <Text style={[styles.emptyTitle, { color: text }]}>All caught up</Text>
          <Text style={[styles.emptySub, { color: textSecondary }]}>No notifications</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item: AppNotification) => item.id}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + 80 }}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={() => checkLowStock()} />
          }
          renderItem={({ item }) => (
            <NotificationItem
              item={item}
              onMarkRead={() => handleNotificationTap(item)}
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
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderBottomWidth: 1,
  },
  summaryText: { fontSize: fontSize.sm, fontWeight: '600' },
  markAll: { fontSize: fontSize.sm, fontWeight: '600' },
  filterBar: {
    paddingVertical: spacing.sm, borderBottomWidth: 1,
  },
  filterChip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderRadius: 16, borderWidth: 1, marginRight: spacing.sm,
  },
  filterLabel: { fontSize: fontSize.xs, fontWeight: '600' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.sm },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: '700', marginTop: spacing.md },
  emptySub: { fontSize: fontSize.sm },
})
