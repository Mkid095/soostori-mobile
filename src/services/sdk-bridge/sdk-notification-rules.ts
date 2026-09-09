// sdk-notification-rules.ts — Notification rendering rules
import type { SoostoriEvent } from '@soostori/events'
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

export const RULES: NotificationRule[] = [
  { eventName: LOW_STOCK_DETECTED, severity: 'warning', title: () => 'Low stock', body: (e) => {
    const p = (e.payload as { productName?: string; currentStock?: number; threshold?: number })
    return `${p.productName ?? 'Product'} at ${p.currentStock ?? '?'} (threshold ${p.threshold ?? '?'})`
  }},
  { eventName: DEBT_CREATED, severity: 'info', title: () => 'Debt recorded', body: (e) => {
    const p = (e.payload as { customerId?: string; amount?: number })
    return `Customer ${p.customerId ?? ''}: ${p.amount ?? 0}`
  }},
  { eventName: DEBT_PAYMENT_RECORDED, severity: 'info', title: () => 'Payment received', body: (e) => {
    const p = (e.payload as { debtId?: string; amount?: number })
    return `Debt ${p.debtId ?? ''}: ${p.amount ?? 0}`
  }},
  { eventName: SUBSCRIPTION_EXPIRING_SOON, severity: 'warning', title: () => 'Subscription expiring', body: (e) => {
    const p = (e.payload as { daysRemaining?: number })
    return `Expires in ${p.daysRemaining ?? 0} day(s)`
  }},
  { eventName: SUBSCRIPTION_EXPIRED, severity: 'critical', title: () => 'Subscription expired', body: () => 'POS operations are blocked. Renew to continue.' },
  { eventName: SYNC_SNAPSHOT_DOWNLOADED, severity: 'info', title: () => 'Cloud snapshot restored', body: (e) => {
    const p = (e.payload as { recordCounts?: Record<string, number> })
    return Object.entries(p.recordCounts ?? {}).map(([k, v]) => `${k}:${v}`).join(', ')
  }},
  { eventName: SALE_COMPLETED, severity: 'info', title: () => 'Sale completed', body: (e) => {
    const p = (e.payload as { total?: number })
    return `Total: ${p.total ?? 0}`
  }},
  { eventName: DEVICE_OFFLINE, severity: 'warning', title: () => 'Device offline', body: (e) => {
    const p = (e.payload as { deviceId?: string })
    return `${p.deviceId ?? 'A device'} went offline.`
  }},
  { eventName: PRIMARY_DEVICE_LOST, severity: 'critical', title: () => 'Primary device lost', body: () => 'Stock mutations are blocked until primary is reachable.' },
]
