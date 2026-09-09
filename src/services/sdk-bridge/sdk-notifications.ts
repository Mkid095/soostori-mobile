// sdk-bridge/sdk-notifications.ts — Notifications bridge orchestration
import { getEventBus, type SoostoriEvent } from '@soostori/events'
import { RULES } from './sdk-notification-rules'
import { persistNotification } from './sdk-notifications-render'

export type { NotificationSeverity } from './sdk-notification-rules'

let unsubscribeAll: (() => void) | null = null

export function attachSdkNotifications(): () => void {
  if (unsubscribeAll) return unsubscribeAll
  const bus = getEventBus()
  const teardowns: Array<() => void> = []
  for (const rule of RULES) {
    teardowns.push(bus.on(rule.eventName, (event: SoostoriEvent) => {
      void persistNotification(rule, event).catch(() => { /* swallow */ })
    }))
  }
  unsubscribeAll = () => { for (const t of teardowns) t(); unsubscribeAll = null }
  return unsubscribeAll
}

export function detachSdkNotifications(): void {
  if (unsubscribeAll) { unsubscribeAll(); unsubscribeAll = null }
}
