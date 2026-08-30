// app/(tabs)/_layout.tsx — Tab navigator + bottom tab bar + app menu
// All screens are registered here; BottomTabBar filters visible tabs by employee role
import { Tabs } from 'expo-router'
import React from 'react'
import { BottomTabBar } from '../../src/components/bottom-tab-bar/bottom-tab-bar'
import { AppMenu } from '../../src/components/app-menu/app-menu'

export default function TabsLayout() {
  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: 'none' },
        }}
      >
        {/* ── Role-based tabs (visible tabs filtered in BottomTabBar) */}
        <Tabs.Screen name="sell" />
        <Tabs.Screen name="customers" />
        <Tabs.Screen name="receipts" />
        <Tabs.Screen name="scan" />
        <Tabs.Screen name="stock" />
        <Tabs.Screen name="receive" />
        <Tabs.Screen name="dashboard" />
        <Tabs.Screen name="approvals" />

        {/* ── Shared / existing tabs */}
        <Tabs.Screen name="pos" />
        <Tabs.Screen name="inventory" />
        <Tabs.Screen name="low-stock" />
        <Tabs.Screen name="reports" />
        <Tabs.Screen name="sales-history" />
        <Tabs.Screen name="debt" />
        <Tabs.Screen name="clients" />
        <Tabs.Screen name="expenses" />
        <Tabs.Screen name="notifications" />
        <Tabs.Screen name="support" />
        <Tabs.Screen name="settings" />
      </Tabs>
      <AppMenu />
      <BottomTabBar />
    </>
  )
}
