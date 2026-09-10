// useBusinessSetup.ts — Phase 07: Business Setup hook
// Gate: owner/manager role only. Calls businessSetup() via cloud service.
import { useState, useCallback } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { businessSetup, setActiveBusiness } from '../services/cloud-business-setup'
import { enforceCapability } from '../services/sdk-bridge/rbac'
import type { BusinessSetupInput, BusinessSetupResult } from '../types/types-business-setup'
import { getSession } from '../services/cloud-auth'

export interface BusinessSetupState {
  loading: boolean
  error: string | null
  success: BusinessSetupResult | null
}

export function useBusinessSetup() {
  const [state, setState] = useState<BusinessSetupState>({
    loading: false,
    error: null,
    success: null,
  })

  const submit = useCallback(async (input: BusinessSetupInput): Promise<BusinessSetupResult | null> => {
    setState({ loading: true, error: null, success: null })

    try {
      // Gate: owner or manager role
      const session = await getSession()
      const role = session.employeeRole as 'owner' | 'manager' | null
      if (!role || (role !== 'owner' && role !== 'manager')) {
        throw new Error('Only owners or managers can set up a business')
      }

      const result = await businessSetup(input)
      await setActiveBusiness(result.businessId)
      setState({ loading: false, error: null, success: result })
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Business setup failed'
      setState({ loading: false, error: message, success: null })
      return null
    }
  }, [])

  return { ...state, submit }
}
