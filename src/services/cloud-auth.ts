// cloud-auth.ts — Session management and re-exports
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SecureStore from 'expo-secure-store'

// Re-export backend functions for backward compatibility
export {
  cloudSendMagicCode,
  cloudVerifyMagicCode,
  resolveSubscription,
  cloudGetServerTime,
} from './cloud-auth-backend'
export type { CloudAuthResult } from './cloud-auth-backend'

const CLOUD_TOKEN_KEY = '@soostori:cloudToken'

export async function cloudLogout(): Promise<void> {
  // cloudToken is stored in SecureStore; shop/employee remain in AsyncStorage
  await SecureStore.deleteItemAsync(CLOUD_TOKEN_KEY).catch(() => {})
  await AsyncStorage.multiRemove([
    '@soostori:shopId',
    '@soostori:employeeId',
    '@soostori:employeeRole',
  ])
  const { cacheEntitlement } = await import('./entitlement-cache')
  await cacheEntitlement(
    {
      shopId: 'default', status: 'expired', plan: 'free',
      expiresAt: new Date(0).toISOString(), verifiedAt: new Date(0).toISOString(),
      serverTime: new Date(0).toISOString(), nextVerificationDeadline: new Date(0).toISOString(),
    },
    new Date(0).toISOString()
  )
}

export async function getSession(): Promise<{
  userId: string | null
  shopId: string | null
  employeeId: string | null
  employeeRole: string | null
}> {
  const [userId, shopId, employeeId, employeeRole] = await Promise.all([
    SecureStore.getItemAsync(CLOUD_TOKEN_KEY),
    AsyncStorage.getItem('@soostori:shopId'),
    AsyncStorage.getItem('@soostori:employeeId'),
    AsyncStorage.getItem('@soostori:employeeRole'),
  ])
  return { userId, shopId, employeeId, employeeRole }
}
