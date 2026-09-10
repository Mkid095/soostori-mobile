// useBusinessSwitcher.ts — Phase 07: Business Switcher hook
// Lists all businesses the current user has a membership in.
// Tap to switch the active business (stored in AsyncStorage).
import { useState, useEffect, useCallback } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { db } from '../lib/instant-client'
import { setActiveBusiness, getActiveBusinessId } from '../services/cloud-business-setup'
import type { BusinessListItem, BusinessType } from '../types/types-business-setup'
import { getSession } from '../services/cloud-auth'

export interface BusinessSwitcherState {
  businesses: BusinessListItem[]
  activeBusinessId: string | null
  loading: boolean
  error: string | null
}

export function useBusinessSwitcher() {
  const [state, setState] = useState<BusinessSwitcherState>({
    businesses: [],
    activeBusinessId: null,
    loading: true,
    error: null,
  })

  async function load() {
    setState((s: BusinessSwitcherState) => ({ ...s, loading: true, error: null }))
    try {
      const session = await getSession()
      const employeeId = session.employeeId
      const activeId = await getActiveBusinessId()

      if (!employeeId) {
        setState({ businesses: [], activeBusinessId: activeId, loading: false, error: null })
        return
      }

      // Query invitations where this person is the employee
      const result = await db.queryOnce({ invitations: {} })
      const invitations = (result.data.invitations as Array<{
        id: string
        shopId: string
        employeeId: string
        status: string
      }>) || []

      const myInvitations = invitations.filter(
        inv => inv.employeeId === employeeId && inv.status === 'active'
      )

      // Fetch business details for each shopId
      const shopsResult = await db.queryOnce({ shops: {} })
      const shops = (shopsResult.data.shops as Array<{
        id: string
        name: string
      }>) || []

      const businesses: BusinessListItem[] = myInvitations.map(inv => {
        const shop = shops.find(s => s.id === inv.shopId)
        return {
          id: inv.shopId,
          name: shop?.name ?? 'Unnamed Business',
          type: 'retail' as BusinessType,
          country: 'KE',
          currency: 'KES',
          memberCount: 1,
          createdAt: new Date().toISOString(),
        }
      })

      setState({
        businesses,
        activeBusinessId: activeId,
        loading: false,
        error: null,
      })
    } catch (err) {
      setState((s: BusinessSwitcherState) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load businesses',
      }))
    }
  }

  useEffect(() => { load() }, [])

  const switchTo = useCallback(async (businessId: string) => {
    await setActiveBusiness(businessId)
    setState((s: BusinessSwitcherState) => ({ ...s, activeBusinessId: businessId }))
  }, [])

  return { ...state, switchTo, reload: load }
}
