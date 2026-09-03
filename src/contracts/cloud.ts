// Cloud entity type definitions — matches Instant DB schema for Soostori
// Maps to: $users, shops, employees, devices, subscriptions, syncEvents, backupSnapshots

export interface CloudUser {
  id: string
  email: string
  imageURL?: string
  type: 'owner' | 'manager' | 'attendant'
}

export interface CloudShop {
  id: string
  name: string
  slug?: string
  taxRate?: number
  plan?: string
  subscriptionExpiry?: string
  status?: string
}

export interface CloudEmployee {
  id: string
  shopId: string
  name: string
  email?: string
  phone?: string
  role: 'owner' | 'manager' | 'attendant'
  status?: string
  permissions?: Record<string, boolean>
  createdBy?: string
  invitedBy?: string
}

export interface CloudDevice {
  id: string
  shopId: string
  deviceId: string
  deviceName?: string
  deviceType?: 'mobile' | 'desktop'
  isLanHost?: boolean
  status?: string
  lastSeenAt?: string
  authorizedAt?: string
}

export interface SubscriptionEntitlement {
  shopId: string
  status: 'active' | 'past_due' | 'expired' | 'cancelled'
  plan: string
  expiresAt: string
  verifiedAt: string
  serverTime: string
  nextVerificationDeadline: string
}

export interface CloudInvitation {
  id: string
  shopId: string
  employeeId: string
  code: string
  expiresAt: string
  usedAt?: string
  createdAt: string
}

export interface SyncEvent {
  id: string
  entityId: string
  entity: string
  operation: string
  payload?: string
  syncedAt: string
}

export interface BackupSnapshot {
  id: string
  shopId: string
  version: number
  snapshotId: string
  expiresAt?: string
  recordCounts?: Record<string, number>
  sizeBytes?: number
}

export interface CloudAuthResponse {
  user: CloudUser
  shop: CloudShop
  employee?: CloudEmployee
  device?: CloudDevice
  entitlement: SubscriptionEntitlement
  serverTime: string
}
