// useTeamMembers.ts — Phase 14: list active team members
import { useState, useEffect } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { listMembers } from '../services/db-team'
import { enforceCapability } from '../services/sdk-bridge/rbac'
import type { MemberWithEmployee } from '../services/db-team'
import type { Member } from '@soostori/auth/permissions'

const SHOP_ID_KEY = '@soostori:shopId'

interface UseTeamMembersResult {
  members: MemberWithEmployee[]
  loading: boolean
  error: string | null
  canManage: boolean
}

export function useTeamMembers(): UseTeamMembersResult {
  const [members, setMembers] = useState<MemberWithEmployee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [canManage, setCanManage] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const role = await AsyncStorage.getItem('@soostori:employeeRole')
        const shopId = await AsyncStorage.getItem(SHOP_ID_KEY)
        if (!shopId) {
          if (!cancelled) { setLoading(false); setMembers([]) }
          return
        }

        const member: Member | null = role ? { role: role as Member['role'] } : null

        try {
          enforceCapability(member, 'team.view')
        } catch {
          if (!cancelled) { setLoading(false); setMembers([]) }
          return
        }

        try {
          enforceCapability(member, 'team.manage')
          if (!cancelled) setCanManage(true)
        } catch {
          if (!cancelled) setCanManage(false)
        }

        const data = await listMembers(shopId)
        if (!cancelled) {
          setMembers(data)
          setError(null)
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load team members')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  return { members, loading, error, canManage }
}
