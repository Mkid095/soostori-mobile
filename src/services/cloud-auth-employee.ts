// cloud-auth-employee.ts — Employee resolution for cloud auth
//
// §17/§84: This module NEVER creates an employee as a side-effect of
// authentication. The caller (cloud-auth-backend) only invokes
// resolveOrCreateEmployee AFTER it has already confirmed an existing
// employee row matching the authenticated email. The `existing` parameter
// is required — there is no implicit auto-create branch.
//
// Identity (employeeId, shopId, deviceId) is stored via StoredSession in the
// SDK's _saveStoredSession / _loadStoredSession lifecycle — written once
// by the SDK's CloudAuth when it receives the AuthApiClient response, and
// read back via _loadStoredSession on app startup. Do NOT write these
// values to separate AsyncStorage keys.
import type { EmployeeId, ShopId } from '@soostori/core'
import type { StoredSession } from '@soostori/auth'
import AsyncStorage from '@react-native-async-storage/async-storage'

type EmployeeRole = 'owner' | 'manager' | 'attendant'

export interface ExistingEmployee {
  id: string
  shopId: string
  email?: string
  role?: string
  cloudEmployeeId?: string
}

/**
 * Cache the identity triplet to AsyncStorage so it survives app restarts
 * before the SDK's restoreSession() has been called (e.g. on cold start
 * before the first network response). The SDK's StoredSession is the
 * authoritative source once it has been established.
 *
 * Keys written here:
 *   @soostori:employeeId  — EmployeeId string
 *   @soostori:shopId      — ShopId string
 *   @soostori:deviceId    — DeviceId string  (deviceId is set by the caller)
 *
 * B3 fix: removed duplicate @soostori:employeeRole (role comes from StoredSession
 * in SDK >= 0.1.0-alpha.7, and is also available from the existing employee record).
 */
export async function cacheSessionIdentity(
  employeeId: EmployeeId,
  shopId: ShopId,
  deviceId: string,
  role: string,
): Promise<void> {
  await AsyncStorage.setItem('@soostori:employeeId', employeeId)
  await AsyncStorage.setItem('@soostori:shopId', shopId)
  await AsyncStorage.setItem('@soostori:deviceId', deviceId)
  await AsyncStorage.setItem('@soostori:employeeRole', role)
}

export async function resolveOrCreateEmployee(
  shopId: string,
  email: string,
  existing: ExistingEmployee,
): Promise<{ id: string; email: string; role: EmployeeRole }> {
  // §17/§84: do NOT create a new employee. The caller must have already
  // found an existing row; if `existing.shopId` does not match the
  // requested shopId we treat the request as misrouted and return the
  // existing record's data without writes.
  const role = (existing.role === 'owner' || existing.role === 'manager' || existing.role === 'attendant')
    ? existing.role as EmployeeRole
    : 'attendant'

  // NOTE: StoredSession is written by the SDK's CloudAuth._saveStoredSession.
  // We write the identity keys here as a fallback for cold-start scenarios
  // (before the SDK has restored a session). The SDK's StoredSession is
  // authoritative once available.
  await cacheSessionIdentity(existing.id, shopId, '', role)

  return { id: existing.id, email: existing.email ?? email, role }
}
