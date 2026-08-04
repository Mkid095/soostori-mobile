import { Tabs, useRouter } from 'expo-router'
import React from 'react'
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native'
import { ShoppingCart, BarChart3, Package, Menu } from 'lucide-react-native'
import { useAppTheme } from '../../src/hooks/useTheme'
import { useMenu } from '../../src/hooks/MenuContext'

const TABS = [
  { name: 'pos', label: 'POS', icon: ShoppingCart },
  { name: 'reports', label: 'Reports', icon: BarChart3 },
  { name: 'inventory', label: 'Stock', icon: Package },
] as const

export default function TabsLayout() {
  const { effectiveScheme } = useAppTheme()
  const { openMenu } = useMenu()
  const router = useRouter()
  const isDark = effectiveScheme === 'dark'

  const barBg = isDark ? '#1e293b' : '#ffffff'
  const border = isDark ? '#334155' : '#e2e8f0'
  const brand = '#f97316'
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

      {/* Custom bottom bar */}
      <View style={[styles.bar, { backgroundColor: barBg, borderTopColor: border }]}>
        {TABS.map((tab) => {
          const isActive = false // active state handled by screen focus
          const Icon = tab.icon
          return (
            <TouchableOpacity
              key={tab.name}
              style={styles.tab}
              activeOpacity={0.7}
              onPress={() => router.push(`/(tabs)/${tab.name}` as any)}
            >
              <Icon size={22} color={inactive} />
              <Text style={[styles.tabLabel, { color: inactive }]}>{tab.label}</Text>
            </TouchableOpacity>
          )
        })}

        {/* Floating center menu button */}
        <View style={styles.fabWrapper}>
          <TouchableOpacity
            style={[styles.fab, { backgroundColor: brand }]}
            onPress={openMenu}
            activeOpacity={0.85}
          >
            <Menu size={26} color="#fff" />
          </TouchableOpacity>
        </View>
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
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 28,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    // iOS safe area handled by SafeAreaView in each screen
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 2,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 3,
  },
  fabWrapper: {
    position: 'absolute',
    top: -22,
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
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 12,
  },
})
