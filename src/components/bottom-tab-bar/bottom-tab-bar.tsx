// bottom-tab-bar.tsx — Capability-based bottom tab bar for mobile
// Phase 04: tabs are gated by SDK capabilities, not raw role strings.
//
// Attendant (inventory.view only): [Sell] [Customers] [Receipts]
// + inventory.view: [Scan] [Stock] [Receive]
// + reports.view: [Dashboard] [Reports]
// Manager/Owner: all tabs
import React, { useState, useEffect } from 'react'
import { View, TouchableOpacity, Text } from 'react-native'
import { useRouter, usePathname } from 'expo-router'
import { ShoppingCart, Users, Receipt, ScanLine, Package, ClipboardList, LayoutDashboard, BarChart3, CheckCircle, Menu, X, DollarSign } from 'lucide-react-native'
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
  /** Phase 04: capability required to show this tab (coarse permission name) */
  requiredCapability?: string
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

// Phase 06 — Commissions tab (team.view capability gate)
const COMMISSION_TAB: TabDef = {
  key: 'commissions',
  label: 'Commissions',
  href: '/(tabs)/commissions',
  icon: (a, c) => <DollarSign size={22} color={c} />,
}

// Phase 04 coarse-capability constants — must match sdk-bridge/rbac.ts PERMISSIONS
const CAP = {
  INVENTORY_VIEW: 'inventory.view',
  REPORTS_VIEW:   'reports.view',
  TEAM_VIEW:      'team.view',
} as const

// Maps capabilities → tabs that require them
const CAPABILITY_TABS: Record<string, TabDef[]> = {
  [CAP.INVENTORY_VIEW]: INVENTORY_TABS,
  [CAP.REPORTS_VIEW]:   MANAGER_TABS,
  [CAP.TEAM_VIEW]:     [COMMISSION_TAB],
}

const ICON_SIZE = 22

export function BottomTabBar() {
  const router   = useRouter()
  const pathname = usePathname()
  const insets   = useSafeAreaInsets()
  const { effectiveScheme } = useAppTheme()
  const { menuOpen, toggleMenu } = useMenu()
  const [capabilities, setCapabilities] = useState<Set<string>>(new Set())

  const isDark = effectiveScheme === 'dark'
  const barBg  = isDark ? colors.dark.card : '#ffffff'
  const s      = makeStyles(isDark, barBg)

  useEffect(() => {
    // Phase 04: load role and derive capabilities from role defaults
    AsyncStorage.getItem(EMPLOYEE_ROLE_KEY).then((r) => {
      const role = r as EmployeeRole | null
      const caps = deriveCapabilities(role)
      setCapabilities(caps)
    })
  }, [])

  /**
   * Phase 04: Derive coarse capabilities from role.
   * Mirrors @soostori/auth ROLE_DEFAULT_CAPABILITIES resolution.
   * This is a client-side convenience — actual enforcement uses SDK can().
   */
  function deriveCapabilities(role: EmployeeRole | null): Set<string> {
    const all: string[] = []
    if (!role) return new Set()

    if (role === 'owner') {
      // owner has everything
      return new Set([CAP.INVENTORY_VIEW, CAP.REPORTS_VIEW, CAP.TEAM_VIEW, 'pos.sell', 'team.manage', 'settings.update'])
    }
    if (role === 'manager') {
      return new Set([CAP.INVENTORY_VIEW, CAP.REPORTS_VIEW, CAP.TEAM_VIEW, 'pos.sell', 'team.manage'])
    }
    if (role === 'attendant') {
      return new Set([CAP.INVENTORY_VIEW])
    }
    return new Set()
  }

  function getTabs(): TabDef[] {
    const tabs: TabDef[] = [...ATTENDANT_TABS]
    // Phase 04: add tabs based on capabilities, not role strings
    if (capabilities.has(CAP.INVENTORY_VIEW)) tabs.push(...INVENTORY_TABS)
    if (capabilities.has(CAP.REPORTS_VIEW))   tabs.push(...MANAGER_TABS)
    return tabs
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
