// app-menu-nav.tsx — Nav items data (pure data, no hooks, no state)
import React from 'react'
import {
  ShoppingCart,
  Package,
  BarChart3,
  FileText,
  Users,
  Settings,
} from 'lucide-react-native'

export interface NavItem {
  label: string
  href: string
  icon: React.ReactElement
}

export const MENU_ITEMS: NavItem[] = [
  { label: 'Point of Sale',   href: '/(tabs)/pos',            icon: <ShoppingCart size={22} /> },
  { label: 'Inventory',       href: '/(tabs)/inventory',      icon: <Package size={22} /> },
  { label: 'Sales Reports',   href: '/(tabs)/reports',        icon: <BarChart3 size={22} /> },
  { label: 'Sales History',  href: '/(tabs)/sales-history',  icon: <FileText size={22} /> },
  { label: 'Debt Management', href: '/(tabs)/debt',          icon: <Users size={22} /> },
  { label: 'Settings',        href: '/(tabs)/settings',       icon: <Settings size={22} /> },
]