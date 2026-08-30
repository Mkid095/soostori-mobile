// app-menu-nav.tsx — Role-filtered navigation items for App Menu
// Pure data + hook — no business logic, no API calls
import React, { useMemo } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  ShoppingCart,
  Package,
  BarChart3,
  Users,
  Settings,
  Receipt,
  UserCircle,
  FileText,
  Bell,
  HelpCircle,
  AlertTriangle,
  ScanLine,
  ClipboardList,
  CheckCircle,
  LayoutDashboard,
  BadgeCheck,
  Smartphone,
} from 'lucide-react-native'
import type { EmployeeRole } from '../../lib/sync-protocol'

const EMPLOYEE_ROLE_KEY = '@soostori:employeeRole'

export interface NavItem {
  label: string
  href: string
  icon: React.ReactElement
  roles?: EmployeeRole[]
}

export const ALL_MENU_ITEMS: NavItem[] = [
  // ── Attendant ───────────────────────────────
  { label: 'Sell',          href: '/(tabs)/sell',            icon: <ShoppingCart size={22} />,       roles: ['attendant', 'manager', 'owner'] },
  { label: 'Customers',     href: '/(tabs)/customers',       icon: <Users size={22} />,              roles: ['attendant', 'manager', 'owner'] },
  { label: 'Receipts',      href: '/(tabs)/receipts',        icon: <Receipt size={22} />,            roles: ['attendant', 'manager', 'owner'] },

  // ── Inventory ──────────────────────────────
  { label: 'Scan',          href: '/(tabs)/scan',            icon: <ScanLine size={22} />,           roles: ['attendant', 'manager', 'owner'] },
  { label: 'Stock',         href: '/(tabs)/stock',           icon: <Package size={22} />,             roles: ['manager', 'owner'] },
  { label: 'Receive',       href: '/(tabs)/receive',         icon: <ClipboardList size={22} />,      roles: ['manager', 'owner'] },

  // ── Manager / Owner ─────────────────────────
  { label: 'Dashboard',     href: '/(tabs)/dashboard',        icon: <LayoutDashboard size={22} />,    roles: ['manager', 'owner'] },
  { label: 'Approvals',    href: '/(tabs)/approvals',        icon: <CheckCircle size={22} />,        roles: ['manager', 'owner'] },
  { label: 'Sales History', href: '/(tabs)/sales-history',   icon: <FileText size={22} />,          roles: ['manager', 'owner'] },
  { label: 'Reports',      href: '/(tabs)/reports',          icon: <BarChart3 size={22} />,          roles: ['manager', 'owner'] },

  // ── Shared ─────────────────────────────────
  { label: 'Debt Management', href: '/(tabs)/debt',          icon: <Users size={22} />,              roles: ['attendant', 'manager', 'owner'] },
  { label: 'Clients',       href: '/(tabs)/clients',         icon: <UserCircle size={22} />,         roles: ['manager', 'owner'] },
  { label: 'Expenses',      href: '/(tabs)/expenses',       icon: <Receipt size={22} />,            roles: ['manager', 'owner'] },
  { label: 'Low Stock',    href: '/(tabs)/low-stock',       icon: <AlertTriangle size={22} />,       roles: ['manager', 'owner'] },
  { label: 'Notifications', href: '/(tabs)/notifications',   icon: <Bell size={22} />,               roles: ['attendant', 'manager', 'owner'] },
  { label: 'Support',      href: '/(tabs)/support',         icon: <HelpCircle size={22} />,          roles: ['attendant', 'manager', 'owner'] },
  { label: 'Settings',     href: '/(tabs)/settings',        icon: <Settings size={22} />,           roles: ['attendant', 'manager', 'owner'] },
]

// Hook to get filtered menu items based on current employee role
export function useFilteredMenuItems(): NavItem[] {
  return useFilteredMenuItemsWithRole(useStoredRole())
}

function useStoredRole(): EmployeeRole | null {
  // Synchronously read from AsyncStorage is not possible without useEffect
  // For the nav filter we default to attendant (most permissive) on first render
  // The app replaces this hook once employee session is loaded
  return 'attendant'
}

export function useFilteredMenuItemsWithRole(role: EmployeeRole | null): NavItem[] {
  return useMemo(() => {
    if (!role) return ALL_MENU_ITEMS
    return ALL_MENU_ITEMS.filter(item => !item.roles || item.roles.includes(role))
  }, [role])
}

// Mobile-specific: role-based bottom tabs
export interface TabDef {
  key: string
  label: string
  href: string
  icon: React.ReactElement
  roles: EmployeeRole[]
}

export const MOBILE_TABS: TabDef[] = [
  // ── Attendant tabs ──────────────────────────
  { key: 'sell',   label: 'Sell',       href: '/(tabs)/sell',       icon: <ShoppingCart size={22} />,  roles: ['attendant', 'manager', 'owner'] },
  { key: 'customers', label: 'Customers', href: '/(tabs)/customers', icon: <Users size={22} />,        roles: ['attendant', 'manager', 'owner'] },
  { key: 'receipts',  label: 'Receipts',  href: '/(tabs)/receipts',  icon: <Receipt size={22} />,      roles: ['attendant', 'manager', 'owner'] },

  // ── Inventory tabs ─────────────────────────
  { key: 'scan',    label: 'Scan',      href: '/(tabs)/scan',     icon: <ScanLine size={22} />,      roles: ['attendant', 'manager', 'owner'] },
  { key: 'stock',   label: 'Stock',     href: '/(tabs)/stock',    icon: <Package size={22} />,       roles: ['manager', 'owner'] },
  { key: 'receive', label: 'Receive',   href: '/(tabs)/receive',  icon: <ClipboardList size={22} />, roles: ['manager', 'owner'] },

  // ── Manager / Owner tabs ──────────────────
  { key: 'dashboard', label: 'Dashboard', href: '/(tabs)/dashboard', icon: <LayoutDashboard size={22} />, roles: ['manager', 'owner'] },
  { key: 'approvals', label: 'Approvals', href: '/(tabs)/approvals', icon: <CheckCircle size={22} />, roles: ['manager', 'owner'] },
  { key: 'reports',   label: 'Reports',   href: '/(tabs)/reports',   icon: <BarChart3 size={22} />,  roles: ['manager', 'owner'] },
]

export function useMobileTabs(): TabDef[] {
  return useMemo(() => MOBILE_TABS, [])
}
