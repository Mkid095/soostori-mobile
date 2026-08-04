// Full-page menu overlay — slides up from bottom, covers the full screen

import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, TouchableOpacity, Modal, StyleSheet,
  ScrollView,
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
  { label: 'Point of Sale', href: '/(tabs)/pos', icon: <ShoppingCart size={22} /> },
  { label: 'Inventory', href: '/(tabs)/inventory', icon: <Package size={22} /> },
  { label: 'Sales Reports', href: '/(tabs)/reports', icon: <BarChart3 size={22} /> },
  { label: 'Debt Management', href: '/(tabs)/debt', icon: <Users size={22} /> },
  { label: 'Settings', href: '/(tabs)/settings', icon: <Settings size={22} /> },
]

export function AppMenu() {
  const { card, text, textSecondary, border, brand } = useTheme()
  const { effectiveScheme, toggleScheme } = useAppTheme()
  const { menuOpen, closeMenu } = useMenu()
  const router = useRouter()
  const pathname = usePathname()
  const [pendingSync, setPendingSync] = useState(0)

  const loadSync = useCallback(async () => {
    try {
      const count = await getPendingSyncCount()
      setPendingSync(count)
    } catch { /* ignore */ }
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
    <Modal visible={menuOpen} animationType="slide" onRequestClose={closeMenu} presentationStyle="overFullScreen">
      <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={closeMenu} />
      <View style={[s.panel, { backgroundColor: card }]}>
        <View style={s.handleRow}><View style={[s.handle, { backgroundColor: border }]} /></View>
        <View style={[s.header, { borderBottomColor: border }]}>
          <Text style={[s.headerTitle, { color: text }]}>Menu</Text>
          <TouchableOpacity onPress={closeMenu} style={s.closeBtn}><CloseIcon size={20} color={textSecondary} /></TouchableOpacity>
        </View>
        <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
          {MENU_ITEMS.map((item) => {
            const active = pathname.startsWith(item.href)
            return (
              <TouchableOpacity
                key={item.href}
                style={[s.navItem, { borderBottomWidth: 1, borderBottomColor: border }, active && { backgroundColor: `${brand}12` }]}
                onPress={() => navigate(item.href)}
                activeOpacity={0.7}
              >
                <View style={[s.iconWrap, active && { backgroundColor: `${brand}18` }]}>
                  {React.cloneElement(item.icon as React.ReactElement<any>, { color: active ? brand : textSecondary })}
                </View>
                <Text style={[s.navLabel, { color: active ? brand : text }, active && { fontWeight: '800' }]}>
                  {item.label}
                </Text>
                {active && <View style={[s.activeDot, { backgroundColor: brand }]} />}
              </TouchableOpacity>
            )
          })}
        </ScrollView>
        <View style={[s.footer, { borderTopColor: border }]}>
          <TouchableOpacity style={s.footerItem} onPress={loadSync} activeOpacity={0.7}>
            <Database size={18} color={pendingSync > 0 ? brand : textSecondary} />
            <Text style={[s.footerLabel, { color: textSecondary }]}>Sync {pendingSync > 0 ? `(${pendingSync})` : ''}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.footerItem} onPress={toggleScheme} activeOpacity={0.7}>
            {isDark ? <Sun size={18} color={textSecondary} /> : <Moon size={18} color={textSecondary} />}
            <Text style={[s.footerLabel, { color: text }]}>{isDark ? 'Light Mode' : 'Dark Mode'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const s = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)' },
  panel: {
    position: 'absolute', bottom: 0, left: 0, right: 0, maxHeight: '85%',
    borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 20,
  },
  handleRow: { alignItems: 'center', paddingTop: 12, paddingBottom: 4 },
  handle: { width: 40, height: 4, borderRadius: 2 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  closeBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 8 },
  navItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  iconWrap: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  navLabel: { flex: 1, fontSize: 16, fontWeight: '700' },
  activeDot: { width: 8, height: 8, borderRadius: 4 },
  footer: { flexDirection: 'row', borderTopWidth: 1, paddingTop: 16, paddingHorizontal: 16, gap: 8 },
  footerItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12 },
  footerLabel: { fontSize: 13, fontWeight: '700' },
})
