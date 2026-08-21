// bottom-tab-bar.tsx — isolated bottom tab bar: [POS] [·FAB·] [Reports]
import React from 'react'
import { View, TouchableOpacity, Text } from 'react-native'
import { useRouter, usePathname } from 'expo-router'
import { ShoppingCart, BarChart3, Menu, X } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAppTheme } from '../../hooks/useTheme'
import { useMenu } from '../../hooks/MenuContext'
import { colors } from '../../lib/theme'
import { makeStyles, TAB_BAR_HEIGHT, FAB_SIZE } from './bottom-tab-bar.styles'

const ICON_SIZE = 22

export function BottomTabBar() {
  const router   = useRouter()
  const pathname = usePathname()
  const insets   = useSafeAreaInsets()
  const { effectiveScheme } = useAppTheme()
  const { menuOpen, toggleMenu } = useMenu()

  const isDark = effectiveScheme === 'dark'
  const barBg  = isDark ? colors.dark.card : '#ffffff'
  const s      = makeStyles(isDark, barBg)

  function isActive(href: string) {
    return pathname.startsWith(href)
  }

  return (
    <View
      style={[
        s.bar,
        {
          height: TAB_BAR_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      {/* Left — POS */}
      <TouchableOpacity
        style={s.tab}
        activeOpacity={0.7}
        onPress={() => router.push('/(tabs)/pos' as any)}
      >
        {isActive('/(tabs)/pos') && <View style={s.activePill} />}
        {isActive('/(tabs)/pos') && <View style={s.activeBg} />}

        <View style={s.tabContent}>
          <ShoppingCart
            size={ICON_SIZE}

            color={isActive('/(tabs)/pos') ? colors.brand : (isDark ? colors.dark.textSecondary : colors.muted)}
          />
          <Text
            style={[
              s.tabLabel,
              { color: isActive('/(tabs)/pos') ? colors.brand : (isDark ? colors.dark.textSecondary : colors.muted) },
            ]}
          >
            POS
          </Text>
        </View>
      </TouchableOpacity>

      {/* Center — FAB anchored here */}
      <View style={s.centerSpacer}>
        <TouchableOpacity
          style={s.fab}
          onPress={toggleMenu}
          activeOpacity={0.85}
        >
          {menuOpen ? (

            <X size={20} color="#fff" />
          ) : (

            <Menu size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      {/* Right — Reports */}
      <TouchableOpacity
        style={s.tab}
        activeOpacity={0.7}
        onPress={() => router.push('/(tabs)/reports' as any)}
      >
        {isActive('/(tabs)/reports') && <View style={s.activePill} />}
        {isActive('/(tabs)/reports') && <View style={s.activeBg} />}

        <View style={s.tabContent}>
          <BarChart3
            size={ICON_SIZE}

            color={isActive('/(tabs)/reports') ? colors.brand : (isDark ? colors.dark.textSecondary : colors.muted)}
          />
          <Text
            style={[
              s.tabLabel,
              { color: isActive('/(tabs)/reports') ? colors.brand : (isDark ? colors.dark.textSecondary : colors.muted) },
            ]}
          >
            Reports
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  )
}
