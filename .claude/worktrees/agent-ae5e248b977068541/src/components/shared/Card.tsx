// Shared Card — bordered surface with optional title and right-aligned action.
// Pure presentation: no business logic, no API calls.

import { View, Text, StyleSheet, type ViewStyle } from 'react-native'
import { useTheme } from '../../hooks/useTheme'

export interface CardProps {
  title?: string
  action?: React.ReactNode
  children: React.ReactNode
  style?: ViewStyle
}

export function Card({ title, action, children, style }: CardProps) {
  const { card: bg, border, text } = useTheme()
  return (
    <View style={[styles.card, { backgroundColor: bg, borderColor: border }, style]}>
      {(title || action) && (
        <View style={styles.header}>
          {title ? <Text style={[styles.title, { color: text }]}>{title}</Text> : <View />}
          {action ? <View>{action}</View> : null}
        </View>
      )}
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: { fontSize: 15, fontWeight: '800' },
})
