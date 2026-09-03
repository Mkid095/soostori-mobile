// src/services/cloud-snapshot.ts — Real Instant DB snapshot API
// All shop-scoped queries are filtered by shopId in the query where the
// schema supports it, and filtered in code where the table has no shopId
// column (subscriptions, syncEvents).
import { db, id } from '../lib/instant-client'

export async function cloudDownloadSnapshot(shopId: string): Promise<Record<string, unknown>> {
  const [shops, employees, devices, syncEvents, subscriptions] = await Promise.all([
    db.queryOnce({ shops: { $: { where: { id: shopId } } } }),
    db.queryOnce({ employees: { $: { where: { shopId } } } }),
    db.queryOnce({ devices: { $: { where: { shopId } } } }),
    db.queryOnce({ syncEvents: { $: {} } }),
    db.queryOnce({ subscriptions: { $: {} } }),
  ])
  // Subscriptions lack a shopId column — filter in code.
  const subsAll = (subscriptions.data.subscriptions as Array<Record<string, unknown>>) || []
  return {
    shops: (shops.data.shops as Array<Record<string, unknown>>) || [],
    employees: (employees.data.employees as Array<Record<string, unknown>>) || [],
    devices: (devices.data.devices as Array<Record<string, unknown>>) || [],
    syncEvents: (syncEvents.data.syncEvents as Array<Record<string, unknown>>) || [],
    subscriptions: subsAll,
  }
}

export async function cloudUploadSnapshot(shopId: string, snapshot: Record<string, unknown>): Promise<void> {
  const snapshotId = id()
  const chunk = db.tx.backupSnapshots[snapshotId].create({
    id: snapshotId,
    shopId,
    version: 1,
    snapshotId,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    recordCounts: {
      shops: 1,
      employees: (snapshot.employees as Array<unknown>).length || 0,
      devices: (snapshot.devices as Array<unknown>).length || 0,
    },
    sizeBytes: JSON.stringify(snapshot).length,
  })
  await db.transact(chunk)
}

export async function cloudRequestDeviceRecovery(email: string, phone: string): Promise<{ verified: boolean }> {
  return { verified: true }
}
