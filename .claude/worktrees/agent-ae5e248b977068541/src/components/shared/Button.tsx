// Shared Button — primary/secondary/danger variants.
// Pure presentation: no business logic, no API calls.

import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, type ViewStyle } from 'react-native'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success'

export interface ButtonProps {
  label: string
  onPress: () => void
  variant?: ButtonVariant
  disabled?: boolean
  loading?: boolean
  fullWidth?: boolean
  style?: ViewStyle
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
}: ButtonProps) {
  const bg = BG[variant]
  const fg = variant === 'secondary' ? '#1e293b' : '#fff'
  const isInactive = disabled || loading
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      disabled={isInactive}
      style={[
        styles.base,
        { backgroundColor: isInactive ? '#94a3b8' : bg, opacity: isInactive ? 0.7 : 1 },
        fullWidth ? styles.fullWidth : null,
        style,
      ]}
    >
      {loading
        ? <ActivityIndicator size="small" color={fg} />
        : <Text style={[styles.label, { color: fg }]}>{label}</Text>}
    </TouchableOpacity>
  )
}

const BG: Record<ButtonVariant, string> = {
  primary: '#f97316',
  secondary: '#f1f5f9',
  danger: '#ef4444',
  success: '#22c55e',
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  fullWidth: { alignSelf: 'stretch' },
  label: { fontSize: 14, fontWeight: '700' },
})
