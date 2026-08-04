import { Tabs } from 'expo-router'
import React from 'react'
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native'
import { ShoppingCart, BarChart3, Package, Menu } from 'lucide-react-native'
import { useAppTheme } from '../../src/hooks/useTheme'
import { useMenu } from '../../src/hooks/MenuContext'

export default function TabsLayout() {
  const { effectiveScheme } = useAppTheme()
  const { openMenu } = useMenu()
  const isDark = effectiveScheme === 'dark'

  const barBg = isDark ? '#1e293b' : '#ffffff'
  const border = isDark ? '#334155' : '#e2e8f0'
  const active = '#f97316'
  const inactive = '#94a3b8'

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

      {/* Custom bottom bar — 3 tabs + floating center menu button */}
      <View style={[styles.bar, { backgroundColor: barBg, borderTopColor: border }]}>
        {/* Left tab */}
        <TouchableOpacity style={styles.tab} activeOpacity={0.7}>
          <ShoppingCart size={22} color={inactive} />
          <Text style={styles.tabLabel}>POS</Text>
        </TouchableOpacity>

        {/* Spacer for floating button */}
        <View style={styles.spacer} />

        {/* Right tab */}
        <TouchableOpacity style={styles.tab} activeOpacity={0.7}>
          <BarChart3 size={22} color={inactive} />
          <Text style={styles.tabLabel}>Reports</Text>
        </TouchableOpacity>

        {/* Floating center menu button — overlaps top of bar */}
        <View style={styles.fabWrapper}>
          <TouchableOpacity
            style={[styles.fab, { backgroundColor: active }]}
            onPress={openMenu}
            activeOpacity={0.8}
          >
            <Menu size={26} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Far right tab */}
        <TouchableOpacity style={styles.tab} activeOpacity={0.7}>
          <Package size={22} color={inactive} />
          <Text style={styles.tabLabel}>Stock</Text>
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
    paddingTop: 10,
    paddingBottom: 28,
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
    color: '#94a3b8',
    marginTop: 3,
  },
  spacer: {
    flex: 1,
  },
  fabWrapper: {
    position: 'absolute',
    top: -20,
    alignSelf: 'center',
    left: '50%',
    marginLeft: -28,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 10,
  },
})
