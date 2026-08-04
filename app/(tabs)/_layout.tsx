import { Tabs, useRouter } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native'
import { ShoppingCart, BarChart3, Menu } from 'lucide-react-native'
import { useAppTheme } from '../../src/hooks/useTheme'
import { useMenu } from '../../src/hooks/MenuContext'
import { getShopSettings } from '../../src/services/db-settings'

export default function TabsLayout() {
  const { effectiveScheme } = useAppTheme()
  const { openMenu } = useMenu()
  const router = useRouter()
  const [shopName, setShopName] = useState('Menu')

  useEffect(() => {
    getShopSettings().then((s) => {
      if (s?.name) setShopName(s.name)
    }).catch(() => { /* use default */ })
  }, [])

  const isDark = effectiveScheme === 'dark'
  const barBg = isDark ? '#1e293b' : '#ffffff'
  const border = isDark ? '#334155' : '#e2e8f0'
  const brand = '#f97316'
  const inactive = '#94a3b8'
  const active = brand

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: 'none' },
        }}
      >
        <Tabs.Screen name="pos" />
        <Tabs.Screen name="reports" />
        <Tabs.Screen name="inventory" />
        <Tabs.Screen name="debt" />
      </Tabs>

      {/* Custom bottom bar */}
      <View style={[styles.bar, { backgroundColor: barBg, borderTopColor: border }]}>
        {/* Left — POS tab */}
        <TouchableOpacity
          style={styles.tab}
          activeOpacity={0.7}
          onPress={() => router.push('/(tabs)/pos' as any)}
        >
          <ShoppingCart size={22} color={inactive} />
          <Text style={[styles.tabLabel, { color: inactive }]}>POS</Text>
        </TouchableOpacity>

        {/* Center spacer — makes room for FAB */}
        <View style={styles.centerSpacer} />

        {/* Right — Reports tab */}
        <TouchableOpacity
          style={styles.tab}
          activeOpacity={0.7}
          onPress={() => router.push('/(tabs)/reports' as any)}
        >
          <BarChart3 size={22} color={inactive} />
          <Text style={[styles.tabLabel, { color: inactive }]}>Reports</Text>
        </TouchableOpacity>

        {/* Floating center FAB — perfectly centered between left and right tabs */}
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: brand }]}
          onPress={openMenu}
          activeOpacity={0.85}
        >
          <Text style={styles.fabLabel} numberOfLines={1}>{shopName}</Text>
        </TouchableOpacity>
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingBottom: 28,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 4,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 3,
  },
  // Equal space on both sides so FAB sits centered
  centerSpacer: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    // Center between left-tab-end and right-tab-start
    // bar paddingHorizontal = 0, each tab flex = 1, centerSpacer flex = 1
    // FAB is centered at the exact horizontal center of the bar
    alignSelf: 'center',
    left: '25%',      // = 50% - half FAB width
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 14,
  },
  fabLabel: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
})
