// ThemeContext + useTheme — provides forced color scheme app-wide
// Toggle persists and actually changes the entire app's appearance

import React, { createContext, useContext, useState, useCallback } from 'react'
import { useColorScheme } from 'react-native'
import { colors, spacing, radius, fontSize, fontWeight } from '../lib/theme'

type ColorScheme = 'light' | 'dark'

interface ThemeContextValue {
  forcedScheme: ColorScheme | null
  effectiveScheme: ColorScheme
  toggleScheme: () => void
}

const ThemeContext = createContext<ThemeContextValue>({
  forcedScheme: null,
  effectiveScheme: 'light',
  toggleScheme: () => {},
})

export function useAppTheme() {
  return useContext(ThemeContext)
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const rawScheme = useColorScheme()
  const systemScheme: ColorScheme = rawScheme === 'dark' || rawScheme === 'light' ? rawScheme : 'light'
  const [forcedScheme, setForcedScheme] = useState<ColorScheme | null>(null)

  const effectiveScheme: ColorScheme = forcedScheme ?? systemScheme

  const toggleScheme = useCallback(() => {
    setForcedScheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }, [])

  return (
    <ThemeContext.Provider value={{ forcedScheme, effectiveScheme, toggleScheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const { effectiveScheme: scheme } = useContext(ThemeContext)
  const isDark = scheme === 'dark'
  const c = isDark ? colors.dark : colors.light

  return {
    isDark,
    bg: c.bg,
    card: c.card,
    text: c.text,
    textSecondary: c.textSecondary,
    border: c.border,
    brand: colors.brand,
    brandLight: colors.brandLight,
    success: colors.success,
    successDark: colors.successDark,
    warning: colors.warning,
    danger: colors.danger,
    muted: colors.muted,
    spacing,
    radius,
    fontSize,
    fontWeight,
  }
}
