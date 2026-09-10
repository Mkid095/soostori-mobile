// BusinessContext.tsx — Phase 07: Global active business context
// Provides active business name to AppHeader and any screen that needs it.
// Stores active business ID in AsyncStorage (@soostori:shopId).
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { db } from '../lib/instant-client'

const ACTIVE_BUSINESS_KEY = '@soostori:shopId'

interface ActiveBusiness {
  businessId: string
  businessName: string
}

interface BusinessContextValue {
  activeBusiness: ActiveBusiness | null
  switchBusiness: (businessId: string) => Promise<void>
  refreshActiveBusiness: () => Promise<void>
  // Switcher modal
  switcherVisible: boolean
  openSwitcher: () => void
  closeSwitcher: () => void
}

const BusinessContext = createContext<BusinessContextValue>({
  activeBusiness: null,
  switchBusiness: async () => {},
  refreshActiveBusiness: async () => {},
  switcherVisible: false,
  openSwitcher: () => {},
  closeSwitcher: () => {},
})

export function BusinessProvider({ children }: { children: React.ReactNode }) {
  const [activeBusiness, setActiveBusiness] = useState<ActiveBusiness | null>(null)
  const [switcherVisible, setSwitcherVisible] = useState(false)

  async function loadActiveBusiness() {
    const businessId = await AsyncStorage.getItem(ACTIVE_BUSINESS_KEY)
    if (!businessId) {
      setActiveBusiness(null)
      return
    }
    try {
      const result = await db.queryOnce({ shops: {} })
      const shops = (result.data.shops as Array<{ id: string; name: string }>) || []
      const shop = shops.find(s => s.id === businessId)
      setActiveBusiness({ businessId, businessName: shop?.name ?? 'Business' })
    } catch {
      setActiveBusiness({ businessId, businessName: 'Business' })
    }
  }

  useEffect(() => {
    loadActiveBusiness()
  }, [])

  const switchBusiness = useCallback(async (businessId: string) => {
    await AsyncStorage.setItem(ACTIVE_BUSINESS_KEY, businessId)
    await loadActiveBusiness()
  }, [])

  const openSwitcher = useCallback(() => setSwitcherVisible(true), [])
  const closeSwitcher = useCallback(() => setSwitcherVisible(false), [])

  return (
    <BusinessContext.Provider
      value={{
        activeBusiness,
        switchBusiness,
        refreshActiveBusiness: loadActiveBusiness,
        switcherVisible,
        openSwitcher,
        closeSwitcher,
      }}
    >
      {children}
    </BusinessContext.Provider>
  )
}

export function useActiveBusiness() {
  return useContext(BusinessContext)
}
