// bottom-tab-bar.styles.ts — isolated styles for BottomTabBar
import { StyleSheet, ViewStyle } from 'react-native'
import { colors, spacing, radius } from '../../lib/theme'

export const TAB_BAR_HEIGHT = 64
export const FAB_SIZE      = 52

// zIndex — tab bar must be above the menu panel
export const TAB_BAR_ZINDEX = 100

export const makeStyles = (isDark: boolean, barBg: string) => {
  const muted = isDark ? colors.dark.textSecondary : colors.muted

  return StyleSheet.create({
    bar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: TAB_BAR_HEIGHT,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: barBg,
      borderTopWidth: 1,
      borderTopColor: isDark ? colors.dark.border : colors.light.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: isDark ? 0.25 : 0.06,
      shadowRadius: 6,
      elevation: 10,
      zIndex: TAB_BAR_ZINDEX,
    } as ViewStyle,

    tab: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      height: TAB_BAR_HEIGHT,
      position: 'relative',
    },

    activeBg: {
      position: 'absolute',
      top: spacing.sm,
      left: spacing.lg,
      right: spacing.lg,
      bottom: spacing.sm,
      borderRadius: radius.lg,
      backgroundColor: isDark ? `${colors.brand}18` : `${colors.brand}14`,
    } as ViewStyle,

    activePill: {
      position: 'absolute',
      top: 0,
      left: '28%',
      right: '28%',
      height: 3,
      borderBottomLeftRadius: radius.full,
      borderBottomRightRadius: radius.full,
      backgroundColor: colors.brand,
    } as ViewStyle,

    tabContent: {
      alignItems: 'center',
      justifyContent: 'center',
    },

    tabLabel: {
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.4,
      marginTop: 3,
      color: muted,
    },

    centerSpacer: {
      flex: 1,
      alignItems: 'center',
      height: TAB_BAR_HEIGHT,
    },

    fab: {
      position: 'absolute',
      top: -10,
      width: FAB_SIZE,
      height: FAB_SIZE,
      borderRadius: FAB_SIZE / 2,
      backgroundColor: colors.brand,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: colors.brand,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 12,
      zIndex: TAB_BAR_ZINDEX + 1,
    } as ViewStyle,
  })
}
