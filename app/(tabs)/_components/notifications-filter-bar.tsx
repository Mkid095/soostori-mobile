// app/(tabs)/_components/notifications-filter-bar.tsx — Phase 17
import React from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native'
import { colors, spacing, fontSize } from '../../../src/lib/theme'
import type { AppNotification } from '../../../src/lib/types'

const FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Sales', value: 'sale' },
  { label: 'Debt', value: 'debt' },
  { label: 'Inventory', value: 'inventory' },
  { label: 'Team', value: 'team' },
]

export function matchesFilter(notif: AppNotification, filter: string): boolean {
  if (filter === 'all') return true
  const et = (notif.data?.eventType as string | undefined) ??
    (notif as unknown as Record<string, unknown>).eventType as string | undefined
  return et ? et.startsWith(filter) : false
}

interface NotificationsFilterBarProps {
  filter: string
  onFilterChange: (value: string) => void
  border: string
  textSecondary: string
}

export function NotificationsFilterBar({
  filter,
  onFilterChange,
  border,
  textSecondary,
}: NotificationsFilterBarProps) {
  return (
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
            onPress={() => onFilterChange(item.value)}
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
  )
}

const styles = StyleSheet.create({
  filterBar: {
    paddingVertical: spacing.sm, borderBottomWidth: 1,
  },
  filterChip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderRadius: 16, borderWidth: 1, marginRight: spacing.sm,
  },
  filterLabel: { fontSize: fontSize.xs, fontWeight: '600' },
})
