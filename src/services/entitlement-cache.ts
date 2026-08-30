// Entitlement cache — 3-day offline grace window
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { SubscriptionEntitlement } from '../contracts/cloud'

const ENTITLEMENT_KEY = '@soostori:entitlement'
const VERIFICATION_DEADLINE_KEY = '@soostori:verificationDeadline'
const LAST_VERIFIED_KEY = '@soostori:lastVerifiedAt'
const SERVER_TIME_KEY = '@soostori:serverTime'

export async function cacheEntitlement(
  entitlement: SubscriptionEntitlement,
  serverTime: string
): Promise<void> {
  await AsyncStorage.multiSet([
    [ENTITLEMENT_KEY, JSON.stringify(entitlement)],
    [VERIFICATION_DEADLINE_KEY, entitlement.nextVerificationDeadline],
    [LAST_VERIFIED_KEY, new Date().toISOString()],
    [SERVER_TIME_KEY, serverTime],
  ])
}

export async function getCachedEntitlement(): Promise<SubscriptionEntitlement | null> {
  const raw = await AsyncStorage.getItem(ENTITLEMENT_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as SubscriptionEntitlement
  } catch {
    return null
  }
}

export async function getVerificationDeadline(): Promise<string | null> {
  return AsyncStorage.getItem(VERIFICATION_DEADLINE_KEY)
}

export async function isWithinGraceWindow(): Promise<boolean> {
  const deadline = await getVerificationDeadline()
  if (!deadline) return false
  return new Date() < new Date(deadline)
}

export async function clearEntitlementCache(): Promise<void> {
  await AsyncStorage.multiRemove([
    ENTITLEMENT_KEY,
    VERIFICATION_DEADLINE_KEY,
    LAST_VERIFIED_KEY,
    SERVER_TIME_KEY,
  ])
}
