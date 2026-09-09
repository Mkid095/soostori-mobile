// bottom-tab-bar.tsx — Role-based bottom tab bar for mobile
// Attendant: [Sell] [Customers] [Receipts]
// Inventory (manager+): [Scan] [Stock] [Receive]
// Manager/Owner: [Dashboard] [Sales] [Approvals] [Reports]
import React, { useState, useEffect } from 'react'
import { View, TouchableOpacity, Text } from 'react-native'
import { useRouter, usePathname } from 'expo-router'
import { ShoppingCart, Users, Receipt, ScanLine, Package, ClipboardList, LayoutDashboard, BarChart3, CheckCircle, Menu, X } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAppTheme } from '../../hooks/useTheme'
import { useMenu } from '../../hooks/MenuContext'
import { colors } from '../../lib/theme'
import { makeStyles, TAB_BAR_HEIGHT, FAB_SIZE } from './bottom-tab-bar.styles'
import type { EmployeeRole } from '../../lib/sync-protocol'

const EMPLOYEE_ROLE_KEY = '@soostori:employeeRole'

interface TabDef {
  key: string
  label: string
  href: string
  icon: (active: boolean, color: string) => React.ReactElement
}

const ATTENDANT_TABS: TabDef[] = [
  { key: 'sell',      label: 'Sell',       href: '/(tabs)/sell',      icon: (a, c) => <ShoppingCart size={22} color={c} /> },
  { key: 'customers', label: 'Customers',  href: '/(tabs)/customers', icon: (a, c) => <Users size={22} color={c} /> },
  { key: 'receipts',  label: 'Receipts',   href: '/(tabs)/receipts',  icon: (a, c) => <Receipt size={22} color={c} /> },
]

const INVENTORY_TABS: TabDef[] = [
  { key: 'scan',    label: 'Scan',     href: '/(tabs)/scan',    icon: (a, c) => <ScanLine size={22} color={c} /> },
  { key: 'stock',   label: 'Stock',    href: '/(tabs)/stock',   icon: (a, c) => <Package size={22} color={c} /> },
  { key: 'receive', label: 'Receive',  href: '/(tabs)/receive', icon: (a, c) => <ClipboardList size={22} color={c} /> },
]

const MANAGER_TABS: TabDef[] = [
  { key: 'dashboard', label: 'Dashboard', href: '/(tabs)/dashboard', icon: (a, c) => <LayoutDashboard size={22} color={c} /> },
  { key: 'reports',   label: 'Reports',   href: '/(tabs)/reports',   icon: (a, c) => <BarChart3 size={22} color={c} /> },
  { key: 'approvals', label: 'Approvals', href: '/(tabs)/approvals', icon: (a, c) => <CheckCircle size={22} color={c} /> },
]

const ICON_SIZE = 22

export function BottomTabBar() {
  const router   = useRouter()
  const pathname = usePathname()
  const insets   = useSafeAreaInsets()
  const { effectiveScheme } = useAppTheme()
  const { menuOpen, toggleMenu } = useMenu()
  const [role, setRole] = useState<EmployeeRole | null>(null)

  const isDark = effectiveScheme === 'dark'
  const barBg  = isDark ? colors.dark.card : '#ffffff'
  const s      = makeStyles(isDark, barBg)

  useEffect(() => {
    AsyncStorage.getItem(EMPLOYEE_ROLE_KEY).then((r) => {
      if (r === 'owner' || r === 'manager') setRole(r)
      else setRole('attendant')
    })
  }, [])

  function getTabs(): TabDef[] {
    if (role === 'manager') return [...ATTENDANT_TABS, ...INVENTORY_TABS, ...MANAGER_TABS]
    if (role === 'owner') return [...ATTENDANT_TABS, ...INVENTORY_TABS, ...MANAGER_TABS]
    return ATTENDANT_TABS
  }

  function isActive(href: string) {
    return pathname.startsWith(href)
  }

  const tabs = getTabs()
  const tabWidth = `${100 / tabs.length}%`

  return (
    <View
      style={[
        s.bar,
        { height: TAB_BAR_HEIGHT + insets.bottom, paddingBottom: insets.bottom },
      ]}
    >
      {tabs.map((tab) => {
        const active = isActive(tab.href)
        const activeColor = active ? colors.brand : (isDark ? colors.dark.textSecondary : colors.muted)
        return (
          <TouchableOpacity
            key={tab.key}
            style={[{ width: tabWidth as any }, { alignItems: 'center', justifyContent: 'center', height: TAB_BAR_HEIGHT }]}
            activeOpacity={0.7}
            onPress={() => router.push(tab.href as any)}
          >
            {active && <View style={s.activePill} />}
            <View style={{ alignItems: 'center' }}>
              {tab.icon(active, activeColor)}
              <Text style={[s.tabLabel, { color: activeColor }]}>{tab.label}</Text>
            </View>
          </TouchableOpacity>
        )
      })}

      {/* Center — FAB */}
      <TouchableOpacity style={s.fab} onPress={toggleMenu} activeOpacity={0.85}>
        {menuOpen ? <X size={20} color="#fff" /> : <Menu size={20} color="#fff" />}
      </TouchableOpacity>
    </View>
  )
}
