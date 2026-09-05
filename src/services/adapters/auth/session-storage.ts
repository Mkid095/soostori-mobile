/**
 * AsyncStorage SessionStorage — Mobile platform session adapter.
 *
 * Implements the published `@soostori/auth` SessionStorage contract using
 * `@react-native-async-storage/async-storage` as the backing store.
 *
 * IMPORTANT — Phase 11.1 scope:
 *   - This establishes the contract boundary only.
 *   - The existing authentication flow is NOT replaced.
 *   - PBKDF2 PIN compatibility remains an explicit future migration task.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import type { SessionStorage } from '@soostori/auth'

export class AsyncStorageSessionStorage implements SessionStorage {
  // AsyncStorage returns string | null. setItem/deleteItem return Promise<void>.
  // The SessionStorage contract permits either sync OR Promise returns.

  async get(key: string): Promise<string | null> {
    return AsyncStorage.getItem(key)
  }

  async set(key: string, value: string): Promise<void> {
    await AsyncStorage.setItem(key, value)
  }

  async delete(key: string): Promise<void> {
    await AsyncStorage.removeItem(key)
  }
}
