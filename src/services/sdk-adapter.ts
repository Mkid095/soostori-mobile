// sdk-adapter.ts — React Native platform adapter for @soostori/auth
// Provides: secure storage (expo-secure-store), crypto RNG, network status
import * as SecureStore from 'expo-secure-store'

// OperationalPlatformAdapter — extracted from @soostori/auth/dist/operational-auth
interface OperationalPlatformAdapter {
  getSecureStorage(): {
    get(key: string): string | null | Promise<string | null>
    set(key: string, value: string): void | Promise<void>
    delete(key: string): void | Promise<void>
  }
  randomString(byteLength: number): string
}

// PlatformAuthAdapter — extracted from @soostori/auth/dist/cloud-auth
interface SecureStorage {
  get(key: string): string | null | Promise<string | null>
  set(key: string, value: string): void | Promise<void>
  delete(key: string): void | Promise<void>
}

interface NetworkStatus {
  isOnline: boolean
  effectiveType?: string
}

interface PlatformAuthAdapter {
  openOAuthBrowser(url: string): Promise<void>
  getSecureStorage(): SecureStorage
  getNetworkStatus(): NetworkStatus
  randomString(byteLength: number): string
}

function getNetworkStatus(): NetworkStatus {
  try {
    const NetInfo = require('@react-native-community/netinfo').default
    const state = NetInfo.getConnectionInfo()
    return {
      isOnline: state.type !== 'none' && state.type !== 'unknown',
      effectiveType: state.effectiveType,
    }
  } catch {
    return { isOnline: true }
  }
}

function getSecureStorage(): SecureStorage {
  return {
    async get(key: string): Promise<string | null> {
      return SecureStore.getItemAsync(key)
    },
    async set(key: string, value: string): Promise<void> {
      return SecureStore.setItemAsync(key, value)
    },
    async delete(key: string): Promise<void> {
      return SecureStore.deleteItemAsync(key)
    },
  }
}

function randomString(byteLength: number): string {
  // react-native-quick-crypto is a peer dependency installed in node_modules
  const { randomBytes } = require('react-native-quick-crypto') as {
    randomBytes: (n: number) => Uint8Array
  }
  const bytes = randomBytes(byteLength)
  return Array.from(bytes)
    .map((b: number) => b.toString(16).padStart(2, '0'))
    .join('')
}

// Platform adapter for CloudAuth (handles OAuth, session storage, network)
export const rnPlatformAdapter: PlatformAuthAdapter = {
  openOAuthBrowser: async (_url: string) => {
    // On mobile, Google Sign-In uses native mobile libraries (not browser OAuth)
    // This is only called on platforms that use browser-based OAuth
    console.warn('openOAuthBrowser called on mobile — using native Google Sign-In instead')
  },
  getSecureStorage: getSecureStorage,
  getNetworkStatus: getNetworkStatus,
  randomString,
}

// Platform adapter subset needed by OperationalAuth
export const rnOperationalPlatformAdapter: OperationalPlatformAdapter = {
  getSecureStorage: getSecureStorage,
  randomString,
}
