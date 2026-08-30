// app/(tabs)/_layout.tsx — Tab navigator + bottom tab bar + app menu
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
        <Tabs.Screen name="receipts" />
      </Tabs>
      {/* AppMenu rendered ABOVE BottomTabBar in the same parent — zIndex/elevation now works */}
      <AppMenu />
      <BottomTabBar />
    </>
  )
}
