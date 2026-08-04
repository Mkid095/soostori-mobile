// Colors — brand #F97316 matches desktop's --brand-orange
export const colors = {
  brand: '#F97316',
  brandLight: '#FB923C',
  success: '#22C55E',
  successDark: '#10B981', // used for "paid" status
  warning: '#F59E0B',
  danger: '#EF4444',
  muted: '#94A3B8',
  // Light mode backgrounds
  light: {
    bg: '#F8FAFC',
    card: '#FFFFFF',
    text: '#0F172A',
    textSecondary: '#475569',
    border: '#E2E8F0',
  },
  // Dark mode backgrounds
  dark: {
    bg: '#0F172A',
    card: '#1E293B',
    text: '#F1F5F9',
    textSecondary: '#CBD5E1',
    border: '#334155',
  },
} as const

// Spacing — 4px grid system
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const

// Border radius
export const radius = {
  sm: 6,
  md: 10,
  lg: 12,
  xl: 16,
  full: 9999,
} as const

// Font sizes
export const fontSize = {
  xs: 11,
  sm: 12,
  base: 14,
  md: 15,
  lg: 16,
  xl: 18,
  '2xl': 20,
  '3xl': 24,
} as const

// Font weights
export const fontWeight = {
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
}
