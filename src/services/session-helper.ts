// src/services/session-helper.ts
//
// Resolves the current employee role and member from AsyncStorage.
// Used by RBAC enforcement at the service-layer boundary.

import AsyncStorage from '@react-native-async-storage/async-storage'
import type { EmployeeRole } from '@soostori/core'
import type { Member } from '@soostori/auth/permissions'

const EMPLOYEE_ROLE_KEY = '@soostori:employeeRole'
const SHOP_ID_KEY = '@soostori:shopId'
const EMPLOYEE_ID_KEY = '@soostori:employeeId'

/** Returns the current employee's role, or null if no session is active. */
export async function getCurrentRole(): Promise<EmployeeRole | null> {
  const role = await AsyncStorage.getItem(EMPLOYEE_ROLE_KEY)
  if (!role) return null
  return role as EmployeeRole
}

/** Returns the current shop ID, or null if no session is active. */
export async function getCurrentShopId(): Promise<string | null> {
  return await AsyncStorage.getItem(SHOP_ID_KEY)
}

/**
 * Phase 04 — Returns the current employee as a canonical SDK Member object.
 * This is what enforceCapability() expects.
 * Supports optional memberCapabilityOverrides from future cloud schema.
 */
export async function getCurrentMember(): Promise<Member | null> {
  const [role, employeeId] = await Promise.all([
    AsyncStorage.getItem(EMPLOYEE_ROLE_KEY),
    AsyncStorage.getItem(EMPLOYEE_ID_KEY),
  ])
  if (!role) return null
  return { role: role as EmployeeRole }
}
