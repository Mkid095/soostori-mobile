// sdk-notifications-render.ts — Notification persistence
import type { SoostoriEvent } from '@soostori/events'
import { getDb } from '../../lib/db'
import { generateId } from '../../lib/formatters'
import type { NotificationSeverity } from './sdk-notification-rules'
import { RULES } from './sdk-notification-rules'

export async function persistNotification(
  rule: typeof RULES[number],
  event: SoostoriEvent
): Promise<void> {
  const db = await getDb()
  const id = generateId()
  await db.runAsync(
    `INSERT INTO notifications (id, type, title, body, data, is_read, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)`,
    [id, rule.severity, rule.title(event), rule.body(event),
     JSON.stringify({ eventId: event.id, eventName: event.name, shopId: event.shopId }),
     new Date().toISOString()]
  )
}

export function renderNotification(
  rule: typeof RULES[number],
  event: SoostoriEvent
): { title: string; body: string; severity: NotificationSeverity } {
  return { title: rule.title(event), body: rule.body(event), severity: rule.severity }
}
