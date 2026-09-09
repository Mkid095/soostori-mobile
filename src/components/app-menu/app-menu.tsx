// app-menu.tsx — Menu panel that slides up from behind the tab bar
import React, { useState, useEffect, useRef } from 'react'
import { View, Text, TouchableOpacity, Animated } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, useAppTheme } from '../../hooks/useTheme'
import { useMenu } from '../../hooks/MenuContext'
import { TAB_BAR_HEIGHT } from '../bottom-tab-bar/bottom-tab-bar.styles'
import { makeStyles } from './app-menu.styles'
import { AppMenuNavItems } from './app-menu-nav-items'
import { useMenuSync } from '../../hooks/useMenuSync'

const PANEL_H = 0.75
const SLIDE_MS = 300
const EXIT_HOLD_MS = 320

export function AppMenu() {
  const insets = useSafeAreaInsets()
  const { card, text, textSecondary, border, brand, success } = useTheme()
  const { effectiveScheme, toggleScheme } = useAppTheme()
  const { menuOpen, closeMenu } = useMenu()
  const s = makeStyles()
  const { pendingSync, syncing, loadSync } = useMenuSync(menuOpen)
  const [mounted, setMounted] = useState(false)
  const syncScale = useRef(new Animated.Value(1)).current
  const themeScale = useRef(new Animated.Value(1)).current
  const closeScale = useRef(new Animated.Value(1)).current
  const isDark = effectiveScheme === 'dark'

  const slideAnim = useRef(new Animated.Value(1)).current
  const fadeAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: menuOpen ? 0 : 300, duration: SLIDE_MS, useNativeDriver: true }),
      Animated.timing(fadeAnim,  { toValue: menuOpen ? 1 : 0,  duration: 200,    useNativeDriver: true }),
    ]).start()
  }, [menuOpen])

  useEffect(() => {
    if (menuOpen) { setMounted(true); return }
    const t = setTimeout(() => setMounted(false), EXIT_HOLD_MS)
    return () => clearTimeout(t)
  }, [menuOpen])

  if (!mounted) return null

  const syncColor = syncing ? brand : pendingSync === 0 ? success : brand
  const syncLabel = syncing ? 'Syncing…' : pendingSync === 0 ? 'Up to date' : `${pendingSync} changes`

  return (
    <>
      <Animated.View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', opacity: fadeAnim }}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={closeMenu} />
      </Animated.View>

      <Animated.View
        style={{
          position: 'absolute',
          left: 0, right: 0,
          bottom: -300,
          height: 300,
          backgroundColor: card,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          transform: [{ translateY: slideAnim }],
        }}
      >
        <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: border }} />
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: border }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: text }}>Menu</Text>
          <TouchableOpacity onPress={closeMenu} style={{ padding: 4 }}>
            <Text style={{ color: textSecondary }}>X</Text>
          </TouchableOpacity>
        </View>

        <AppMenuNavItems isDark={isDark} text={text} textSecondary={textSecondary} brand={brand} />

        <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: border, paddingVertical: 12, paddingHorizontal: 16 }}>
          <Animated.View style={{ flex: 1, transform: [{ scale: syncScale }] }}>
            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8 }} onPress={loadSync} disabled={syncing}>
              <Text style={{ fontSize: 12, color: syncColor }}>{syncLabel}</Text>
            </TouchableOpacity>
          </Animated.View>
          <Animated.View style={{ flex: 1, transform: [{ scale: themeScale }] }}>
            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8 }} onPress={toggleScheme}>
              <Text style={{ fontSize: 12, color: text }}>{isDark ? 'Light Mode' : 'Dark Mode'}</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Animated.View>
    </>
  )
}
