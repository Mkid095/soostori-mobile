// src/services/sdk-bridge/sdk-notifications.ts
//
// Mobile notifications bridge.
//
// SDK GAP: @soostori/notifications does not exist on npm yet. Until the
// canonical package ships, this file implements the same fan-out contract:
//
//   EventBus → fan-out rules → mobile notifications table
//
// When @soostori/notifications becomes available, the file should be replaced
// with a thin adapter that imports it; the rule mapping below is the
// contract the SDK notifications package must satisfy.
//
// SDK GAP: <notifications>
// Temporary workaround: local rule table maps canonical event names to
// notification records persisted in the `notifications` table.
// Required SDK change: publish @soostori/notifications with a rule-driven
// publisher (subscribe to EventBus, apply user-configurable rules, emit
// platform-agnostic Notification records). The rule list below is the v1
// of what that package should encode.

import { getEventBus, type SoostoriEvent } from '@soostori/events'
import { getDb } from '../../lib/db'
import { generateId } from '../../lib/formatters'
import {
  LOW_STOCK_DETECTED,
  DEBT_PAYMENT_RECORDED,
  DEBT_CREATED,
  SUBSCRIPTION_EXPIRING_SOON,
  SUBSCRIPTION_EXPIRED,
  SYNC_SNAPSHOT_DOWNLOADED,
  SALE_COMPLETED,
  DEVICE_OFFLINE,
  PRIMARY_DEVICE_LOST,
  type SoostoriEventName,
} from './sdk-bridge-types'

export type NotificationSeverity = 'info' | 'warning' | 'critical'

interface NotificationRule {
  eventName: SoostoriEventName
  severity: NotificationSeverity
  title: (e: SoostoriEvent) => string
  body: (e: SoostoriEvent) => string
}

const RULES: NotificationRule[] = [
  {
    eventName: LOW_STOCK_DETECTED,
    severity: 'warning',
    title: () => 'Low stock',
    body: (e) => {
      const p = (e.payload as { productName?: string; currentStock?: number; threshold?: number })
      return `${p.productName ?? 'Product'} at ${p.currentStock ?? '?'} (threshold ${p.threshold ?? '?'})`
    },
  },
  {
    eventName: DEBT_CREATED,
    severity: 'info',
    title: () => 'Debt recorded',
    body: (e) => {
      const p = (e.payload as { customerId?: string; amount?: number })
      return `Customer ${p.customerId ?? ''}: ${p.amount ?? 0}`
    },
  },
  {
    eventName: DEBT_PAYMENT_RECORDED,
    severity: 'info',
    title: () => 'Payment received',
    body: (e) => {
      const p = (e.payload as { debtId?: string; amount?: number })
      return `Debt ${p.debtId ?? ''}: ${p.amount ?? 0}`
    },
  },
  {
    eventName: SUBSCRIPTION_EXPIRING_SOON,
    severity: 'warning',
    title: () => 'Subscription expiring',
    body: (e) => {
      const p = (e.payload as { daysRemaining?: number })
      return `Expires in ${p.daysRemaining ?? 0} day(s)`
    },
  },
  {
    eventName: SUBSCRIPTION_EXPIRED,
    severity: 'critical',
    title: () => 'Subscription expired',
    body: () => 'POS operations are blocked. Renew to continue.',
  },
  {
    eventName: SYNC_SNAPSHOT_DOWNLOADED,
    severity: 'info',
    title: () => 'Cloud snapshot restored',
    body: (e) => {
      const p = (e.payload as { recordCounts?: Record<string, number> })
      const counts = p.recordCounts ?? {}
      return Object.entries(counts).map(([k, v]) => `${k}:${v}`).join(', ')
    },
  },
  {
    eventName: SALE_COMPLETED,
    // Sales are very chatty — only the first summary shows on the inbox.
    severity: 'info',
    title: () => 'Sale completed',
    body: (e) => {
      const p = (e.payload as { total?: number })
      return `Total: ${p.total ?? 0}`
    },
  },
  {
    eventName: DEVICE_OFFLINE,
    severity: 'warning',
    title: () => 'Device offline',
    body: (e) => {
      const p = (e.payload as { deviceId?: string })
      return `${p.deviceId ?? 'A device'} went offline.`
    },
  },
  {
    eventName: PRIMARY_DEVICE_LOST,
    severity: 'critical',
    title: () => 'Primary device lost',
    body: () => 'Stock mutations are blocked until primary is reachable.',
  },
]

let unsubscribeAll: (() => void) | null = null

/**
 * Attach the notifications bridge to the SDK event bus.
 *
 * Idempotent: repeated calls return the same teardown.
 * Returns the unsubscribe handle.
 */
export function attachSdkNotifications(): () => void {
  if (unsubscribeAll) return unsubscribeAll
  const bus = getEventBus()
  const teardowns: Array<() => void> = []
  for (const rule of RULES) {
    teardowns.push(
      bus.on(rule.eventName, (event: SoostoriEvent) => {
        void persist(rule, event).catch(() => {
          // Silently swallow — notifications must never break the mutation path.
        })
      })
    )
  }
  unsubscribeAll = () => {
    for (const t of teardowns) t()
    unsubscribeAll = null
  }
  return unsubscribeAll
}

export function detachSdkNotifications(): void {
  if (unsubscribeAll) {
    unsubscribeAll()
    unsubscribeAll = null
  }
}

async function persist(rule: NotificationRule, event: SoostoriEvent): Promise<void> {
  const db = await getDb()
  const id = generateId()
  await db.runAsync(
    `INSERT INTO notifications (id, type, title, body, data, is_read, created_at)
     VALUES (?, ?, ?, ?, ?, 0, ?)`,
    [
      id,
      rule.severity,
      rule.title(event),
      rule.body(event),
      JSON.stringify({ eventId: event.id, eventName: event.name, shopId: event.shopId }),
      new Date().toISOString(),
    ]
  )
}
