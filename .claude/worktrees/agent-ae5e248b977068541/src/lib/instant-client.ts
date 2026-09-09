// src/lib/instant-client.ts — Self-hosted Instant DB client
// Uses @fidscript/instant-react which wraps @fidscript/instant-sdk
import { init, i, id, tx, lookup } from '@fidscript/instant-react'

const APP_ID = '0808ca7d-b0ba-4541-8906-48f7d0403950'

const schema = i.schema({
  entities: {
    $users: i.entity({
      email: i.string().unique().indexed(),
      imageURL: i.any(),
      type: i.string(),
    }),
    shops: i.entity({
      id: i.string().unique().indexed(),
      name: i.string(),
      slug: i.string(),
      taxRate: i.number(),
      plan: i.string(),
      subscriptionExpiry: i.string(),
      status: i.string(),
    }),
    employees: i.entity({
      id: i.string().unique().indexed(),
      shopId: i.string(),
      name: i.string(),
      email: i.string(),
      phone: i.string(),
      role: i.string(),
      status: i.string(),
      permissions: i.any(),
      createdBy: i.string(),
      invitedBy: i.string(),
    }),
    devices: i.entity({
      id: i.string().unique().indexed(),
      shopId: i.string(),
      deviceId: i.string(),
      deviceName: i.string(),
      deviceType: i.string(),
      isLanHost: i.boolean(),
      status: i.string(),
      lastSeenAt: i.string(),
      authorizedAt: i.string(),
    }),
    subscriptions: i.entity({
      id: i.string().unique().indexed(),
      planKey: i.string(),
      status: i.string(),
      billingCycle: i.string(),
      deviceLimit: i.number(),
      amountPaid: i.number(),
      currentPeriodStart: i.string(),
      currentPeriodEnd: i.string(),
    }),
    plans: i.entity({
      id: i.string().unique().indexed(),
      key: i.string(),
      name: i.string(),
      priceMonthly: i.number(),
      priceYearly: i.number(),
      deviceLimit: i.number(),
      features: i.any(),
    }),
    syncEvents: i.entity({
      id: i.string().unique().indexed(),
      entityId: i.string(),
      entity: i.string(),
      operation: i.string(),
      payload: i.any(),
      syncedAt: i.string(),
    }),
    backupSnapshots: i.entity({
      id: i.string().unique().indexed(),
      shopId: i.string(),
      version: i.number(),
      snapshotId: i.string(),
      expiresAt: i.string(),
      recordCounts: i.any(),
      sizeBytes: i.number(),
    }),
    invitations: i.entity({
      id: i.string().unique().indexed(),
      shopId: i.string(),
      employeeId: i.string(),
      code: i.string(),
      expiresAt: i.string(),
      status: i.string(),
      email: i.string(),
      phone: i.string(),
      createdBy: i.string(),
      employeeRole: i.string(),
    }),
    syncStatus: i.entity({
      id: i.string().unique().indexed(),
      shopId: i.string(),
      lastSyncAt: i.string(),
      pendingEvents: i.number(),
      deviceCount: i.number(),
      activeDeviceCount: i.number(),
    }),
    payments: i.entity({
      id: i.string().unique().indexed(),
      amount: i.number(),
      status: i.string(),
      currency: i.string(),
      method: i.string(),
      reference: i.string(),
      paidAt: i.string(),
    }),
    subscriptionEvents: i.entity({
      id: i.string().unique().indexed(),
      type: i.string(),
      details: i.any(),
    }),
  },
})

export const db = init({ appId: APP_ID, schema })

export { id, tx, lookup } from '@fidscript/instant-react'
export type { QueryResponse, InstantObject } from '@fidscript/instant-react'
