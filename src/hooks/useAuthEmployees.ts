// useAuthEmployees — loads active employees for PIN login
import { useState, useEffect } from 'react'
import type { Employee } from '../lib/sync-protocol'

export function useAuthEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [isLoading, setIsLoading] = useState(true)

  async function loadEmployees() {
    setIsLoading(true)
    try {
      const { getDb } = await import('../lib/db')
      const db = await getDb()
      const rows = await db.getAllAsync<Record<string, unknown>>(
        `SELECT id, shop_id, name, email, phone, pin_hash, pin_salt, role, is_active, created_at, updated_at
         FROM employees WHERE is_active = 1 ORDER BY name ASC`
      )
      const emps: Employee[] = rows.map((r) => ({
        id: String(r.id),
        shopId: String(r.shop_id),
        name: String(r.name),
        email: r.email ? String(r.email) : undefined,
        phone: r.phone ? String(r.phone) : undefined,
        pinHash: String(r.pin_hash),
        pinSalt: String(r.pin_salt),
        role: (r.role as Employee['role']) ?? 'attendant',
        isActive: Boolean(r.is_active),
        createdAt: String(r.created_at),
        updatedAt: String(r.updated_at),
      }))
      setEmployees(emps)
    } catch {
      setEmployees([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { loadEmployees() }, [])

  return { employees, isLoading, reload: loadEmployees }
}
