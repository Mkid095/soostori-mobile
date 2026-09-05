// src/services/sdk-bridge/sdk-audit-recorder.ts
//
// Wires @soostori/audit.AuditRecorder into the SDK event bus.

import { AuditRecorder } from '@soostori/audit'
import { getEventBus } from '@soostori/events'
import { mobileAuditStorage } from './sdk-audit-storage'

let unsubscribe: (() => void) | null = null

/**
 * Attach the audit recorder to the SDK event bus. Idempotent.
 * Called from app/_layout.tsx after database is ready.
 */
export function attachSdkAuditRecorder(): () => void {
  if (unsubscribe) return unsubscribe
  const recorder = new AuditRecorder(mobileAuditStorage)
  // The SDK AuditRecorder.attach() calls getEventBus().on(name, handler).
  // We cast the bus to bypass the strict type mismatch between the bus's
  // SoostoriEvent<T> handler and the SDK's generic handler type.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  unsubscribe = recorder.attach(() => getEventBus() as any)
  return unsubscribe
}

export function detachSdkAuditRecorder(): void {
  if (unsubscribe) { unsubscribe(); unsubscribe = null }
}
