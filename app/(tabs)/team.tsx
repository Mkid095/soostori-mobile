// app/(tabs)/team.tsx — Phase 14: Team management tab
// Owner/Manager: full team management
// Viewer: read-only members list
// Cashier/Attendant: team tab hidden (BottomTabBar gates visibility)
import React, { useEffect, useState } from 'react'
import { View, Text } from 'react-native'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { TeamScreenContent } from '../../src/components/team/team-screen-content'
import type { EmployeeRole } from '@soostori/core'

const SHOP_ID_KEY = '@soostori:shopId'
const RESTRICTED_ROLES: EmployeeRole[] = ['cashier', 'attendant']

export default function TeamTab() {
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [restricted, setRestricted] = useState(false)
  const router = useRouter()

  useEffect(() => {
    ;(async () => {
      const [shopId, role] = await Promise.all([
        AsyncStorage.getItem(SHOP_ID_KEY),
        AsyncStorage.getItem('@soostori:employeeRole'),
      ])
      if (role && RESTRICTED_ROLES.includes(role as EmployeeRole)) {
        setRestricted(true)
      } else if (shopId) {
        setBusinessId(shopId)
      }
    })()
  }, [])

  if (restricted) {
    // Redirect cashier/attendant away from team tab
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { router.replace('/(tabs)/sell') }, [])
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#94A3B8', fontSize: 14 }}>Not available</Text>
      </View>
    )
  }

  if (!businessId) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#94A3B8', fontSize: 14 }}>Loading…</Text>
      </View>
    )
  }

  return <TeamScreenContent businessId={businessId} />
}
