// Employee CRUD + PBKDF2 PIN — desktop-agent
import { getDb } from '../lib/db'
import type { Employee, EmployeeRole } from '../lib/sync-protocol'
import { generateId } from '../lib/formatters'
import { logAudit } from './db-audit'

const PBKDF2_ITERATIONS = 100_000

export async function hashPin(pin: string): Promise<{ hash: string; salt: string }> {
  // Cryptographically secure random salt using Web Crypto API
  const saltBytes = new Uint8Array(32)
  crypto.getRandomValues(saltBytes)
  const salt = Array.from(saltBytes).map(b => b.toString(16).padStart(2, '0')).join('')
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw', encoder.encode(pin), 'PBKDF2', false, ['deriveBits']
  )
  const hashBuffer = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: encoder.encode(salt), iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    256
  )
  const hash = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  return { hash, salt }
}

export async function verifyPin(pin: string, hash: string, salt: string): Promise<boolean> {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw', encoder.encode(pin), 'PBKDF2', false, ['deriveBits']
  )
  const hashBuffer = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: encoder.encode(salt), iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    256
  )
  const computed = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  return computed === hash
}

function mapRow(row: Record<string, unknown>): Employee {
  return {
    id: String(row.id),
    shopId: String(row.shop_id),
    name: String(row.name),
    email: row.email ? String(row.email) : undefined,
    phone: row.phone ? String(row.phone) : undefined,
    pinHash: String(row.pin_hash),
    pinSalt: String(row.pin_salt),
    role: String(row.role) as EmployeeRole,
    isActive: Boolean(row.is_active),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

export async function getEmployeeById(id: string): Promise<Employee | null> {
  const db = await getDb()
  const row = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM employees WHERE id = ?', [id]
  )
  return row ? mapRow(row) : null
}

export async function getEmployeeByPin(shopId: string, pin: string): Promise<Employee | null> {
  const db = await getDb()
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM employees WHERE shop_id = ? AND is_active = 1',
    [shopId]
  )
  for (const row of rows) {
    const emp = mapRow(row)
    if (await verifyPin(pin, emp.pinHash, emp.pinSalt)) {
      return emp
    }
  }
  return null
}

export async function createEmployee(
  shopId: string,
  name: string,
  pin: string,
  role: EmployeeRole,
  email?: string,
  phone?: string,
): Promise<Employee> {
  const db = await getDb()
  const { hash, salt } = await hashPin(pin)
  const id = generateId()
  const now = new Date().toISOString()
  await db.runAsync(
    `INSERT INTO employees (id, shop_id, name, email, phone, pin_hash, pin_salt, role, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    [id, shopId, name, email ?? null, phone ?? null, hash, salt, role, now, now]
  )
  await logAudit(shopId, 'EMPLOYEE_CREATED', 'employee', id, id, undefined, undefined, JSON.stringify({ name, role }))
  return { id, shopId, name, email, phone, pinHash: hash, pinSalt: salt, role, isActive: true, createdAt: now, updatedAt: now }
}

export async function updateEmployeePin(id: string, pin: string): Promise<void> {
  const db = await getDb()
  const { hash, salt } = await hashPin(pin)
  const now = new Date().toISOString()
  await db.runAsync(
    'UPDATE employees SET pin_hash = ?, pin_salt = ?, updated_at = ? WHERE id = ?',
    [hash, salt, now, id]
  )
  await logAudit('default', 'PIN_CHANGED', 'employee', id, id)
}

export async function listEmployees(shopId: string): Promise<Employee[]> {
  const db = await getDb()
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM employees WHERE shop_id = ? ORDER BY name ASC',
    [shopId]
  )
  return rows.map(mapRow)
}
