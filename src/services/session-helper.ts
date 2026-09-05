// src/services/session-helper.ts
//
// Resolves the current employee role from AsyncStorage.
// Used by RBAC enforcement at the service-layer boundary.

import AsyncStorage from '@react-native-async-storage/async-storage'
import type { EmployeeRole } from '@soostori/core'

const EMPLOYEE_ROLE_KEY = '@soostori:employeeRole'

/** Returns the current employee's role, or null if no session is active. */
export async function getCurrentRole(): Promise<EmployeeRole | null> {
  const role = await AsyncStorage.getItem(EMPLOYEE_ROLE_KEY)
  if (!role) return null
  return role as EmployeeRole
}
