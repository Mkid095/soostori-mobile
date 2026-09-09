// notification-item.tsx — single notification row component
import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { AlertTriangle, CheckCheck, Info, Trash2 } from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import type { AppNotification } from '../../lib/types'
import { colors, spacing, fontSize } from '../../lib/theme'

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function typeIcon(type: AppNotification['type']) {
  switch (type) {
    case 'low_stock': return <AlertTriangle size={20} color={colors.warning} />
    case 'debt_due': return <AlertTriangle size={20} color={colors.danger} />
    case 'sync_complete': return <CheckCheck size={20} color={colors.success} />
    case 'system': return <AlertTriangle size={20} color={colors.danger} />
    case 'info': default: return <Info size={20} color={colors.brand} />
  }
}

interface Props {
  item: AppNotification
  onMarkRead: () => void
  onDelete: () => void
}

export function NotificationItem({ item, onMarkRead, onDelete }: Props) {
  const { card, text, textSecondary, border } = useTheme()

  return (
    <TouchableOpacity
      style={[
        styles.item,
        { backgroundColor: card, borderColor: border },
        !item.isRead && { borderLeftWidth: 3, borderLeftColor: colors.brand },
      ]}
      onPress={onMarkRead}
      activeOpacity={0.7}
    >
      <View style={styles.icon}>{typeIcon(item.type)}</View>
      <View style={styles.body}>
        <Text style={[styles.title, { color: text }]} numberOfLines={1}>
          {item.title}
        </Text>
        {item.body && (
          <Text style={[styles.bodyText, { color: textSecondary }]} numberOfLines={2}>
            {item.body}
          </Text>
        )}
        <Text style={[styles.time, { color: textSecondary }]}>{timeAgo(item.createdAt)}</Text>
      </View>
      <TouchableOpacity style={styles.delete} onPress={onDelete} hitSlop={8}>
        <Trash2 size={15} color={colors.muted} />
      </TouchableOpacity>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    borderRadius: 10,
    borderWidth: 1,
  },
  icon: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center', marginRight: spacing.sm },
  body: { flex: 1, minWidth: 0 },
  title: { fontSize: fontSize.base, fontWeight: '600', marginBottom: 2 },
  bodyText: { fontSize: fontSize.sm, marginBottom: 4, lineHeight: 18 },
  time: { fontSize: fontSize.xs },
  delete: { padding: spacing.xs },
})
