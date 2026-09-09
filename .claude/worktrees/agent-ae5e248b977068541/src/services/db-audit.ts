// Audit log — desktop-agent
import { getDb } from '../lib/db'
import type { AuditLog } from '../lib/sync-protocol'
import { generateId } from '../lib/formatters'

export async function logAudit(
  shopId: string,
  action: string,
  entityType: string,
  entityId: string,
  employeeId?: string,
  deviceId?: string,
  oldValue?: string,
  newValue?: string,
  reason?: string,
): Promise<void> {
  const db = await getDb()
  const id = generateId()
  const now = new Date().toISOString()
  await db.runAsync(
    `INSERT INTO audit_logs (id, shop_id, employee_id, device_id, action, entity_type, entity_id, old_value, new_value, reason, timestamp)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, shopId, employeeId ?? null, deviceId ?? null, action, entityType, entityId, oldValue ?? null, newValue ?? null, reason ?? null, now]
  )
}

export async function getAuditLogs(
  shopId: string,
  entityType?: string,
  entityId?: string,
  limit = 50,
): Promise<AuditLog[]> {
  const db = await getDb()
  let query = 'SELECT * FROM audit_logs WHERE shop_id = ?'
  const params: (string | number | null)[] = [shopId]
  if (entityType) { query += ' AND entity_type = ?'; params.push(entityType) }
  if (entityId) { query += ' AND entity_id = ?'; params.push(entityId) }
  query += ' ORDER BY timestamp DESC LIMIT ?'
  params.push(limit)
  const rows = await db.getAllAsync<Record<string, unknown>>(query, params)
  return rows.map(row => ({
    id: String(row.id),
    shopId: String(row.shop_id),
    employeeId: row.employee_id ? String(row.employee_id) : undefined,
    deviceId: row.device_id ? String(row.device_id) : undefined,
    action: String(row.action),
    entityType: String(row.entity_type),
    entityId: String(row.entity_id),
    oldValue: row.old_value ? String(row.old_value) : undefined,
    newValue: row.new_value ? String(row.new_value) : undefined,
    reason: row.reason ? String(row.reason) : undefined,
    timestamp: String(row.timestamp),
  }))
}
