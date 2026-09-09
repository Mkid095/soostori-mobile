// cloud-auth-employee.ts — Employee resolution for cloud auth
// NOTE: PIN setup is handled by OperationalAuth (device-local), not by cloud auth.
// Cloud auth only resolves the employee identity; it does NOT set up a PIN.
import { listEmployees } from './db-employees'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getDb } from '../lib/db'
import { generateId } from '../lib/formatters'

type EmployeeRole = 'owner' | 'manager' | 'attendant'

export async function resolveOrCreateEmployee(
  shopId: string,
  email: string,
  _cloudDeviceId?: string,
): Promise<{ id: string; email: string; role: EmployeeRole }> {
  const employees = await listEmployees(shopId)
  let localEmployee = employees.find((e) => e.email === email)

  // Create employee WITHOUT a default PIN — PIN is set up by OperationalAuth on first device enrollment.
  // The 'owner' role is assigned to the first employee (shop creator).
  if (!localEmployee) {
    const db = await getDb()
    const id = generateId()
    const now = new Date().toISOString()
    // PIN hash is intentionally left as empty string — must be set via OperationalAuth.setupPin()
    await db.runAsync(
      `INSERT INTO employees (id, shop_id, name, email, phone, pin_hash, pin_salt, role, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [id, shopId, email.split('@')[0], email, null, '', '', 'owner', now, now]
    )
    localEmployee = {
      id,
      shopId,
      name: email.split('@')[0],
      email,
      phone: undefined,
      pinHash: '',
      pinSalt: '',
      role: 'owner' as const,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    }
  }

  await AsyncStorage.setItem('@soostori:shopId', shopId)
  await AsyncStorage.setItem('@soostori:employeeId', localEmployee.id)
  await AsyncStorage.setItem('@soostori:employeeRole', localEmployee.role)

  return { id: localEmployee.id, email: localEmployee.email ?? email, role: localEmployee.role }
}

export async function cacheSession(shopId: string, employeeId: string, employeeRole: string): Promise<void> {
  await AsyncStorage.setItem('@soostori:shopId', shopId)
  await AsyncStorage.setItem('@soostori:employeeId', employeeId)
  await AsyncStorage.setItem('@soostori:employeeRole', employeeRole)
}
