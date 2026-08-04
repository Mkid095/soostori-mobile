// Full-page floating menu — slides up from bottom, dark backdrop, card-like panel
import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, TouchableOpacity, Modal, StyleSheet,
  ScrollView, Dimensions,
} from 'react-native'
import { useRouter, usePathname } from 'expo-router'
import {
  ShoppingCart, Package, BarChart3, Users, Settings,
  Sun, Moon, Database, X as CloseIcon,
} from 'lucide-react-native'
import React from 'react'
import { useTheme, useAppTheme } from '../../hooks/useTheme'
import { useMenu } from '../../hooks/MenuContext'
import { getPendingSyncCount } from '../../services/sync-queue-helper'

interface NavItem {
  label: string
  href: string
  icon: React.ReactElement
}

const MENU_ITEMS: NavItem[] = [
  { label: 'Point of Sale',  href: '/(tabs)/pos',         icon: <ShoppingCart size={22} /> },
  { label: 'Inventory',       href: '/(tabs)/inventory',   icon: <Package size={22} /> },
  { label: 'Sales Reports',   href: '/(tabs)/reports',     icon: <BarChart3 size={22} /> },
  { label: 'Debt Management', href: '/(tabs)/debt',        icon: <Users size={22} /> },
  { label: 'Settings',        href: '/(tabs)/settings',   icon: <Settings size={22} /> },
]

const { height: SCREEN_H } = Dimensions.get('window')
const PANEL_HEIGHT = Math.min(SCREEN_H * 0.72, 560)

export function AppMenu() {
  const { bg, card, text, textSecondary, border, brand } = useTheme()
  const { effectiveScheme, toggleScheme } = useAppTheme()
  const { menuOpen, closeMenu } = useMenu()
  const router = useRouter()
  const pathname = usePathname()
  const [pendingSync, setPendingSync] = useState(0)

  const loadSync = useCallback(async () => {
    try { setPendingSync(await getPendingSyncCount()) } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    if (menuOpen) loadSync()
    const id = setInterval(loadSync, 30_000)
    return () => clearInterval(id)
  }, [menuOpen, loadSync])

  function navigate(href: string) {
    router.push(href as any)
    closeMenu()
  }

  const isDark = effectiveScheme === 'dark'

  return (
    <Modal
      visible={menuOpen}
      animationType="fade"
      onRequestClose={closeMenu}
      transparent
    >
      {/* Dark backdrop */}
      <TouchableOpacity
        style={s.backdrop}
        activeOpacity={1}
        onPress={closeMenu}
      >
        <View style={s.backdropTouch} />
      </TouchableOpacity>

      {/* Floating panel */}
      <View style={s.panelWrapper}>
        <View style={[s.panel, { backgroundColor: card, borderColor: border }]}>
          {/* Drag handle */}
          <View style={s.handleRow}>
            <View style={[s.handle, { backgroundColor: border }]} />
          </View>

          {/* Header */}
          <View style={[s.header, { borderBottomColor: border }]}>
            <Text style={[s.headerTitle, { color: text }]}>Menu</Text>
            <TouchableOpacity onPress={closeMenu} style={s.closeBtn}>
              <CloseIcon size={20} color={textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Nav items */}
          <ScrollView
            style={s.scroll}
            contentContainerStyle={s.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {MENU_ITEMS.map((item) => {
              const active = pathname.startsWith(item.href)
              return (
                <TouchableOpacity
                  key={item.href}
                  style={[
                    s.navItem,
                    { borderBottomColor: border },
                    active && { backgroundColor: `${brand}14` },
                  ]}
                  onPress={() => navigate(item.href)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      s.iconWrap,
                      { backgroundColor: isDark ? `${brand}22` : `${brand}14` },
                      active && { backgroundColor: `${brand}22` },
                    ]}
                  >
                    {React.cloneElement(item.icon as React.ReactElement<{ color?: string; size?: number }>, {
                      color: active ? brand : textSecondary,
                      size: 20,
                    })}
                  </View>
                  <View style={s.navText}>
                    <Text
                      style={[
                        s.navLabel,
                        { color: active ? brand : text },
                        active && { fontWeight: '800' },
                      ]}
                    >
                      {item.label}
                    </Text>
                    {active && (
                      <View style={[s.activeBar, { backgroundColor: brand }]} />
                    )}
                  </View>
                  {active && (
                    <View style={[s.activeDot, { backgroundColor: brand }]} />
                  )}
                </TouchableOpacity>
              )
            })}
          </ScrollView>

          {/* Footer */}
          <View style={[s.footer, { borderTopColor: border }]}>
            <TouchableOpacity style={s.footerBtn} onPress={loadSync} activeOpacity={0.7}>
              <Database size={17} color={pendingSync > 0 ? brand : textSecondary} />
              <Text style={[s.footerLabel, { color: textSecondary }]}>
                Sync{pendingSync > 0 ? ` · ${pendingSync} pending` : ''}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.footerBtn} onPress={toggleScheme} activeOpacity={0.7}>
              {isDark ? (
                <Sun size={17} color={textSecondary} />
              ) : (
                <Moon size={17} color={textSecondary} />
              )}
              <Text style={[s.footerLabel, { color: text }]}>
                {isDark ? 'Light Mode' : 'Dark Mode'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const s = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0)',
  },
  backdropTouch: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  panelWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  panel: {
    width: '100%',
    maxHeight: Math.min(Dimensions.get('window').height * 0.72, 560),
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 30,
  },
  handleRow: { alignItems: 'center', paddingTop: 14, paddingBottom: 6 },
  handle: { width: 36, height: 5, borderRadius: 3 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', letterSpacing: 0.3 },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 8 },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginHorizontal: 12,
    borderRadius: 14,
    marginBottom: 2,
    borderBottomWidth: 0,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  navText: { flex: 1 },
  navLabel: { fontSize: 16, fontWeight: '600' },
  activeBar: { height: 2, borderRadius: 1, marginTop: 3, width: 32 },
  activeDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 4 },
  footer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 14,
    paddingHorizontal: 16,
    gap: 10,
    paddingBottom: 6,
  },
  footerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 12,
    borderRadius: 12,
  },
  footerLabel: { fontSize: 13, fontWeight: '700' },
})
