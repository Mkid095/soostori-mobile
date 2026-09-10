// src/hooks/useCommission.ts
// Phase 06 — Commercial: capability-gated commission data hook
import { useState, useEffect } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { fetchCommissionSummary } from '../services/cloud-commission'
import { enforceCapability } from '../services/sdk-bridge/rbac'
import type { CommissionSummary } from '../types/types-commission'
import type { Member } from '@soostori/auth/permissions'

const EMPLOYEE_ID_KEY = '@soostori:employeeId'

interface UseCommissionResult {
  summary: CommissionSummary | null
  loading: boolean
  error: string | null
  visible: boolean // true when member has team.view capability
}

export function useCommission(): UseCommissionResult {
  const [summary, setSummary] = useState<CommissionSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const employeeId = await AsyncStorage.getItem(EMPLOYEE_ID_KEY)
        if (!employeeId) {
          if (!cancelled) { setLoading(false); setVisible(false) }
          return
        }

        // Try to build a minimal Member object from stored role for capability check
        const role = await AsyncStorage.getItem('@soostori:employeeRole')
        const member: Member | null = role
          ? ({ role: role as Member['role'] } as Member)
          : null

        // Gate: team.view capability required to see commissions
        try {
          enforceCapability(member, 'team.view')
        } catch {
          // Member lacks team.view — hide the screen
          if (!cancelled) { setLoading(false); setVisible(false) }
          return
        }

        if (!cancelled) setVisible(true)

        const data = await fetchCommissionSummary(employeeId)
        if (!cancelled) {
          setSummary(data)
          setError(null)
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load commissions')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  return { summary, loading, error, visible }
}
