// src/services/sdk-bridge/bootstrap.ts
//
// One-stop bootstrap for the SDK bridge. Called from app/_layout.tsx after
// the database is ready. Returns the combined teardown.

import { attachSdkAuditRecorder } from './sdk-audit-recorder'
import { attachSdkNotifications } from './sdk-notifications'

export function attachSdkBridges(): () => void {
  const offAudit = attachSdkAuditRecorder()
  const offNotifications = attachSdkNotifications()
  return () => {
    offAudit()
    offNotifications()
  }
}
