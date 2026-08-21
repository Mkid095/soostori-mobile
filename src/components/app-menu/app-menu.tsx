// app-menu.tsx — Menu panel that slides up from behind the tab bar
// Sync states: 0 = up-to-date (green), >0 = pending (orange), syncing = spinning
import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Animated,
} from 'react-native'
import { useRouter, usePathname } from 'expo-router'
import {
  Database,
  Sun,
  Moon,
  RefreshCw,
  CheckCircle2,
  X as CloseIcon,
} from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, useAppTheme } from '../../hooks/useTheme'
import { useMenu } from '../../hooks/MenuContext'
import { getPendingSyncCount } from '../../services/sync-queue-helper'
import { TAB_BAR_HEIGHT } from '../bottom-tab-bar/bottom-tab-bar.styles'
import { makeStyles } from './app-menu.styles'
import { MENU_ITEMS } from './app-menu-nav'
import { AppMenuItem } from './app-menu-item'

const { height: SCREEN_H } = Dimensions.get('window')
const PANEL_H = SCREEN_H * 0.75
const SLIDE_MS = 300
const EXIT_HOLD_MS = 320
const SYNC_INTERVAL_MS = 30_000

export function AppMenu() {
  const insets = useSafeAreaInsets()
  const { card, text, textSecondary, border, brand, success } = useTheme()
  const { effectiveScheme, toggleScheme } = useAppTheme()
  const { menuOpen, closeMenu } = useMenu()
  const router = useRouter()
  const pathname = usePathname()
  const s = makeStyles()

  const [pendingSync, setPendingSync] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Per-button press animations
  const syncScale   = useRef(new Animated.Value(1)).current
  const themeScale  = useRef(new Animated.Value(1)).current
  const closeScale  = useRef(new Animated.Value(1)).current

  const isDark = effectiveScheme === 'dark'
  const loadSync = useCallback(async () => {
    setSyncing(true)
    try { setPendingSync(await getPendingSyncCount()) } catch { /* ignore */ }
    setSyncing(false)
  }, [])

  useEffect(() => {
    if (menuOpen) loadSync()
    const id = setInterval(loadSync, SYNC_INTERVAL_MS)
    return () => clearInterval(id)
  }, [menuOpen, loadSync])

  useEffect(() => {
    Animated.parallel([
      Animated.timing(syncScale, { toValue: menuOpen ? 1 : 1, duration: 0, useNativeDriver: true }),
      Animated.timing(themeScale, { toValue: menuOpen ? 1 : 1, duration: 0, useNativeDriver: true }),
    ]).start()
  }, [menuOpen])

  useEffect(() => {
    Animated.parallel([
      Animated.timing(syncScale, { toValue: 1, duration: 0, useNativeDriver: true }),
      Animated.timing(themeScale, { toValue: 1, duration: 0, useNativeDriver: true }),
    ]).start()
  }, [])

  // Slide UP from below the screen
  const slideAnim = useRef(new Animated.Value(PANEL_H)).current
  const fadeAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: menuOpen ? 0 : PANEL_H, duration: SLIDE_MS, useNativeDriver: true }),
      Animated.timing(fadeAnim,  { toValue: menuOpen ? 1 : 0,       duration: 200,    useNativeDriver: true }),
    ]).start()
  }, [menuOpen, slideAnim, fadeAnim])

  useEffect(() => {
    if (menuOpen) { setMounted(true); return }
    const t = setTimeout(() => setMounted(false), EXIT_HOLD_MS)
    return () => clearTimeout(t)
  }, [menuOpen])

  if (!mounted) return null

  function navigate(href: string) {
    router.push(href as never)
    closeMenu()
  }

  // Sync button state
  const syncColor = syncing ? brand : pendingSync === 0 ? success : brand
  const syncIcon = syncing ? 'refresh' : pendingSync === 0 ? 'check' : 'database'
  const syncLabel = syncing ? 'Syncing…' : pendingSync === 0 ? 'Up to date' : `${pendingSync} changes`

  return (
    <>
      {/* Backdrop */}
      <Animated.View style={[s.backdrop, { opacity: fadeAnim }]}>
        <TouchableOpacity style={s.backdropTouch} activeOpacity={1} onPress={closeMenu} />
      </Animated.View>

      {/* Panel */}
      <Animated.View
        style={[
          s.panel,
          {
            backgroundColor: card,
            borderColor: border,
            bottom: TAB_BAR_HEIGHT + insets.bottom,
            paddingBottom: TAB_BAR_HEIGHT,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Drag handle */}
        <View style={s.handleRow}>
          <View style={[s.handle, { backgroundColor: border }]} />
        </View>

        {/* Header */}
        <View style={[s.header, { borderBottomColor: border }]}>
          <Text style={[s.headerTitle, { color: text }]}>Menu</Text>
          <Animated.View style={{ transform: [{ scale: closeScale }] }}>
            <TouchableOpacity
              onPress={closeMenu}
              onPressIn={() => Animated.spring(closeScale, { toValue: 0.88, useNativeDriver: true }).start()}
              onPressOut={() => Animated.spring(closeScale, { toValue: 1, useNativeDriver: true }).start()}
              activeOpacity={1}
              style={s.closeBtn}
            >

              <CloseIcon size={20} color={textSecondary} />
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Nav items */}
        <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
          {MENU_ITEMS.map((item) => (
            <AppMenuItem
              key={item.href}
              label={item.label}
              href={item.href}
              icon={item.icon}
              active={pathname.startsWith(item.href)}
              isDark={isDark}
              text={text}
              textSecondary={textSecondary}
              brand={brand}
              onPress={navigate}
            />
          ))}
        </ScrollView>

        {/* Footer */}
        <View style={[s.footer, { borderTopColor: border }]}>
          {/* Sync button */}
          <Animated.View style={{ flex: 1, transform: [{ scale: syncScale }] }}>
            <TouchableOpacity
              style={s.footerBtn}
              onPress={loadSync}
              onPressIn={() => Animated.spring(syncScale, { toValue: 0.93, useNativeDriver: true }).start()}
              onPressOut={() => Animated.spring(syncScale, { toValue: 1, useNativeDriver: true }).start()}
              activeOpacity={1}
              disabled={syncing}
            >
              {syncing ? (

                <RefreshCw size={17} color={syncColor} style={{ transform: [{ rotate: '90deg' }] }} />
              ) : pendingSync === 0 ? (

                <CheckCircle2 size={17} color={syncColor} />
              ) : (

                <Database size={17} color={syncColor} />
              )}
              <Text style={[s.footerLabel, { color: syncColor }]}>
                {syncLabel}
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Theme toggle */}
          <Animated.View style={{ flex: 1, transform: [{ scale: themeScale }] }}>
            <TouchableOpacity
              style={s.footerBtn}
              onPress={toggleScheme}
              onPressIn={() => Animated.spring(themeScale, { toValue: 0.93, useNativeDriver: true }).start()}
              onPressOut={() => Animated.spring(themeScale, { toValue: 1, useNativeDriver: true }).start()}
              activeOpacity={1}
            >
              {isDark ? (

                <Sun size={17} color={textSecondary} />
              ) : (

                <Moon size={17} color={textSecondary} />
              )}
              <Text style={[s.footerLabel, { color: text }]}>
                {isDark ? 'Light Mode' : 'Dark Mode'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Animated.View>
    </>
  )
}
