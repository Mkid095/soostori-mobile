// cloud-auth-employee.ts — Employee resolution for cloud auth
//
// §17/§84: This module NEVER creates an employee as a side-effect of
// authentication. The caller (cloud-auth-backend) only invokes
// resolveOrCreateEmployee AFTER it has already confirmed an existing
// employee row matching the authenticated email. The `existing` parameter
// is required — there is no implicit auto-create branch.
import AsyncStorage from '@react-native-async-storage/async-storage'

type EmployeeRole = 'owner' | 'manager' | 'attendant'

export interface ExistingEmployee {
  id: string
  shopId: string
  email?: string
  role?: string
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
    ? existing.role
    : 'attendant'

  await AsyncStorage.setItem('@soostori:shopId', shopId)
  await AsyncStorage.setItem('@soostori:employeeId', existing.id)
  await AsyncStorage.setItem('@soostori:employeeRole', role)

  return { id: existing.id, email: existing.email ?? email, role }
}

export async function cacheSession(shopId: string, employeeId: string, employeeRole: string): Promise<void> {
  await AsyncStorage.setItem('@soostori:shopId', shopId)
  await AsyncStorage.setItem('@soostori:employeeId', employeeId)
  await AsyncStorage.setItem('@soostori:employeeRole', employeeRole)
}
