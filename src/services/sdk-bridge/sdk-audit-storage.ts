// src/services/sdk-bridge/sdk-audit-storage.ts
//
// Mobile AuditStorage adapter — bridges @soostori/audit.AuditStorage into the
// existing local `audit_logs` table. Mobile writes audit entries through this
// adapter so the SDK AuditRecorder can fan out canonical events.

import {
  type AuditEntry,
  type AuditStorage,
  type AuditFilter,
  AuditAppendError,
} from '@soostori/audit'
import { getDb } from '../../lib/db'

interface AuditRow {
  id: string
  event_id: string | null
  event_name: string | null
  actor_id: string | null
  actor_type: string | null
  entity_type: string
  entity_id: string
  action: string
  before_json: string | null
  after_json: string | null
  reason: string | null
  context_json: string | null
  timestamp: string
  shop_id: string
}

function rowToEntry(row: AuditRow): AuditEntry {
  const parse = (s: string | null): Record<string, unknown> | null => {
    if (!s) return null
    try { return JSON.parse(s) as Record<string, unknown> } catch { return null }
  }
  return {
    id: row.id as unknown as AuditEntry['id'],
    eventId: (row.event_id ?? row.id) as unknown as AuditEntry['eventId'],
    eventName: (row.event_name ?? 'system.error') as unknown as AuditEntry['eventName'],
    actorId: (row.actor_id as unknown as AuditEntry['actorId']) ?? null,
    actorType: (row.actor_type as AuditEntry['actorType']) ?? 'system',
    entityType: row.entity_type,
    entityId: row.entity_id,
    action: row.action,
    before: parse(row.before_json),
    after: parse(row.after_json),
    reason: row.reason,
    context: parse(row.context_json),
    timestamp: row.timestamp as unknown as AuditEntry['timestamp'],
  }
}

export class MobileAuditStorage implements AuditStorage {
  async append(entry: AuditEntry): Promise<void> {
    try {
      const db = await getDb()
      await db.runAsync(
        `INSERT INTO audit_logs (
           id, event_id, event_name, shop_id, employee_id, device_id,
           action, entity_type, entity_id, old_value, new_value, reason, timestamp
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          entry.id,
          entry.eventId,
          entry.eventName,
          // shopId is not part of AuditEntry; the bridge layer derives it from
          // the envelope and embeds it in context.
          extractShopId(entry) ?? 'unknown',
          entry.actorId ?? null,
          null,
          entry.action,
          entry.entityType,
          entry.entityId,
          entry.before ? JSON.stringify(entry.before) : null,
          entry.after ? JSON.stringify(entry.after) : null,
          entry.reason,
          entry.timestamp,
        ]
      )
    } catch (e) {
      throw new AuditAppendError(`audit append failed: ${(e as Error).message}`)
    }
  }

  async query(filter: AuditFilter): Promise<AuditEntry[]> {
    const db = await getDb()
    const where: string[] = []
    const params: (string | number)[] = []

    if (filter.startTime) { where.push('timestamp >= ?'); params.push(filter.startTime) }
    if (filter.endTime) { where.push('timestamp <= ?'); params.push(filter.endTime) }
    if (filter.actorId) { where.push('employee_id = ?'); params.push(filter.actorId) }
    if (filter.eventName) { where.push('event_name = ?'); params.push(filter.eventName) }
    if (filter.entityType) { where.push('entity_type = ?'); params.push(filter.entityType) }
    if (filter.entityId) { where.push('entity_id = ?'); params.push(filter.entityId) }

    const sql = `SELECT * FROM audit_logs ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY timestamp DESC LIMIT 500`
    const rows = await db.getAllAsync<Record<string, unknown>>(sql, params)
    return rows.map((r) => rowToEntry(normalizeRow(r)))
  }

  async countByEventName(filter: AuditFilter): Promise<Record<string, number>> {
    const entries = await this.query(filter)
    const counts: Record<string, number> = {}
    for (const e of entries) {
      counts[e.eventName] = (counts[e.eventName] ?? 0) + 1
    }
    return counts
  }
}

function extractShopId(entry: AuditEntry): string | null {
  // The SDK envelope carries shopId; we encoded it in context.
  const ctx = entry.context
  if (ctx && typeof ctx === 'object' && 'shopId' in ctx) {
    return String((ctx as { shopId: unknown }).shopId)
  }
  return null
}

function normalizeRow(r: Record<string, unknown>): AuditRow {
  return {
    id: String(r.id ?? ''),
    event_id: r.event_id != null ? String(r.event_id) : null,
    event_name: r.event_name != null ? String(r.event_name) : null,
    actor_id: r.actor_id != null ? String(r.actor_id) : null,
    actor_type: r.actor_type != null ? String(r.actor_type) : null,
    entity_type: String(r.entity_type ?? 'unknown'),
    entity_id: String(r.entity_id ?? ''),
    action: String(r.action ?? ''),
    before_json: r.old_value != null ? String(r.old_value) : null,
    after_json: r.new_value != null ? String(r.new_value) : null,
    reason: r.reason != null ? String(r.reason) : null,
    context_json: null,
    timestamp: String(r.timestamp ?? new Date().toISOString()),
    shop_id: String(r.shop_id ?? 'unknown'),
  }
}

/** Singleton instance for the mobile app. */
export const mobileAuditStorage: AuditStorage = new MobileAuditStorage()
