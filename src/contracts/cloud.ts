// Cloud entity type definitions — local types only, no Instant DB manipulation
// These describe what the Soostori Cloud API returns
// Replace with auto-generated types once docs/sync-contract.md is defined

export interface CloudUser {
  id: string
  email: string
  phone?: string
  createdAt: string
}

export interface CloudShop {
  id: string
  name: string
  ownerId: string
  createdAt: string
  updatedAt: string
}

export interface CloudEmployee {
  id: string
  shopId: string
  name: string
  email?: string
  phone?: string
  role: 'owner' | 'manager' | 'attendant'
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CloudDevice {
  id: string
  shopId: string
  employeeId?: string
  deviceName?: string
  deviceType: 'mobile' | 'desktop'
  status: 'registered' | 'authorized' | 'revoked'
  lastSeen?: string
  createdAt: string
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

export interface CloudSyncCursor {
  shopId: string
  deviceId: string
  lastSequenceNumber: number
  lastSyncedAt: string
}

export interface CloudAuthResponse {
  user: CloudUser
  shop: CloudShop
  employee: CloudEmployee
  device: CloudDevice
  entitlement: SubscriptionEntitlement
  serverTime: string
}
