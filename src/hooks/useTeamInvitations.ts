// useTeamInvitations.ts — Phase 14: pending team invitations
import { useState, useEffect } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { listPendingInvitations, cancelInvitation } from '../services/db-team'
import { enforceCapability } from '../services/sdk-bridge/rbac'
import type { TeamInvitation } from '../services/db-team'
import type { Member } from '@soostori/auth/permissions'

const SHOP_ID_KEY = '@soostori:shopId'

interface UseTeamInvitationsResult {
  invitations: TeamInvitation[]
  loading: boolean
  error: string | null
  canManage: boolean
  cancelInv: (id: string) => Promise<void>
}

export function useTeamInvitations(): UseTeamInvitationsResult {
  const [invitations, setInvitations] = useState<TeamInvitation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [canManage, setCanManage] = useState(false)

  async function load() {
    const shopId = await AsyncStorage.getItem(SHOP_ID_KEY)
    if (!shopId) { setInvitations([]); return }
    const data = await listPendingInvitations(shopId)
    setInvitations(data)
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const role = await AsyncStorage.getItem('@soostori:employeeRole')
        const member: Member | null = role ? { role: role as Member['role'] } : null

        try {
          enforceCapability(member, 'team.view')
        } catch {
          if (!cancelled) { setLoading(false); setInvitations([]) }
          return
        }

        try {
          enforceCapability(member, 'team.manage')
          if (!cancelled) setCanManage(true)
        } catch {
          if (!cancelled) setCanManage(false)
        }

        const shopId = await AsyncStorage.getItem(SHOP_ID_KEY)
        if (shopId) {
          const data = await listPendingInvitations(shopId)
          if (!cancelled) { setInvitations(data); setError(null) }
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load invitations')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  async function cancelInv(id: string) {
    const shopId = await AsyncStorage.getItem(SHOP_ID_KEY)
    if (!shopId) return
    await cancelInvitation(id, shopId)
    setInvitations(prev => prev.filter(i => i.id !== id))
  }

  return { invitations, loading, error, canManage, cancelInv }
}
