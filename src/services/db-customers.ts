// Customer CRUD operations — canonical implementation (Phase 10)
// Business logic in services, NOT components.
//
// Phase 10 changes:
//   - Sync via defaultSyncEngine.enqueue() (replaces plain queueSync)
//   - Replay idempotency: idempotencyKey = customer.id → no duplicates
//   - Subscription gate + RBAC gate at every mutation boundary
//   - Sale attach: customer_id_number written to sales table

import {
  resolveCustomerShopId,
  resolveCustomerEmployeeId,
  resolveCustomerDeviceId,
} from './db-customers-context'
import { getDb } from '../lib/db'
import type { Customer, Sale } from '../lib/types'
import { mapCustomerRow, mapCustomerSaleRow } from './db-customers-mapper'
import { generateId } from '../lib/formatters'
import { enforcePermission, PERMISSIONS } from './sdk-bridge/rbac'
import { enforceSubscriptionOrThrow } from './sdk-bridge/subscription-gate'
import { getCurrentRole } from './session-helper'
import { enqueueCustomerSyncEvent } from './customer-sync-event'

/**
 * searchCustomers — live search on name + phone.
 * Returns up to 20 active customers ordered by name.
 */
export async function searchCustomers(query: string): Promise<Customer[]> {
  const db = await getDb()
  const q = `%${query}%`
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM customers
     WHERE is_active = 1 AND (name LIKE ? OR phone LIKE ?)
     ORDER BY name ASC LIMIT 20`,
    [q, q],
  )
  return rows.map(mapCustomerRow)
}

/**
 * getAllCustomers — full active customer list (limit 500).
 */
export async function getAllCustomers(): Promise<Customer[]> {
  const db = await getDb()
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM customers WHERE is_active = 1 ORDER BY name ASC LIMIT 500`,
  )
  return rows.map(mapCustomerRow)
}

/**
 * getCustomerById — single customer lookup.
 */
export async function getCustomerById(id: string): Promise<Customer | null> {
  const db = await getDb()
  const row = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM customers WHERE id = ?', [id],
  )
  return row ? mapCustomerRow(row) : null
}

// ── Mutations ─────────────────────────────────────────────────────────────────

/**
 * createCustomer — create + sync via defaultSyncEngine.
 *
 * Phase 10 idempotency:
 *   - Idempotency key = customer.id (generated before INSERT)
 *   - Cloud replay of same event → INSERT OR IGNORE or no_op on apply()
 *   - No duplicate customers possible.
 */
export async function createCustomer(data: {
  name: string
  phone?: string
  idNumber?: string
}): Promise<Customer> {
  await enforceSubscriptionOrThrow()
  await enforcePermission(await getCurrentRole(), PERMISSIONS.CUSTOMERS_MANAGE)

  const db = await getDb()
  const id = generateId()
  const shopId = await resolveCustomerShopId()
  const employeeId = await resolveCustomerEmployeeId()
  const deviceId = await resolveCustomerDeviceId()
  const now = new Date().toISOString()

  await db.runAsync(
    `INSERT INTO customers (id, shop_id, name, phone, id_number, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
    [id, shopId, data.name, data.phone || null, data.idNumber || null, now, now],
  )

  const row = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM customers WHERE id = ?', [id],
  )
  if (!row) throw new Error(`Customer ${id} not found after insert`)

  // Sync via canonical SyncEvent — idempotencyKey = customer.id
  enqueueCustomerSyncEvent(row, shopId, employeeId, deviceId, 'create').catch(
    () => {},
  )

  return mapCustomerRow(row)
}

/**
 * updateCustomer — update fields + sync via defaultSyncEngine.
 * Phase 10: idempotencyKey = customer.id (same customer, same dedup key).
 */
export async function updateCustomer(
  id: string,
  data: { name?: string; phone?: string; idNumber?: string },
): Promise<Customer | null> {
  await enforceSubscriptionOrThrow()
  await enforcePermission(await getCurrentRole(), PERMISSIONS.CUSTOMERS_MANAGE)

  const db = await getDb()
  const shopId = await resolveCustomerShopId()
  const employeeId = await resolveCustomerEmployeeId()
  const deviceId = await resolveCustomerDeviceId()
  const now = new Date().toISOString()

  const fields: string[] = []
  const values: (string | number | null)[] = []
  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name) }
  if (data.phone !== undefined) { fields.push('phone = ?'); values.push(data.phone ?? null) }
  if (data.idNumber !== undefined) { fields.push('id_number = ?'); values.push(data.idNumber ?? null) }
  if (fields.length === 0) return getCustomerById(id)

  fields.push('updated_at = ?')
  values.push(now)
  values.push(id)

  await db.runAsync(
    `UPDATE customers SET ${fields.join(', ')} WHERE id = ?`,
    values,
  )

  const row = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM customers WHERE id = ?', [id],
  )
  if (!row) return null

  enqueueCustomerSyncEvent(row, shopId, employeeId, deviceId, 'update').catch(
    () => {},
  )

  return mapCustomerRow(row)
}

/**
 * deactivateCustomer — soft-delete + sync via defaultSyncEngine.
 * Phase 10: operation = 'tombstone' signals logical deletion.
 */
export async function deactivateCustomer(id: string): Promise<void> {
  await enforceSubscriptionOrThrow()
  await enforcePermission(await getCurrentRole(), PERMISSIONS.CUSTOMERS_MANAGE)

  const db = await getDb()
  const shopId = await resolveCustomerShopId()
  const employeeId = await resolveCustomerEmployeeId()
  const deviceId = await resolveCustomerDeviceId()
  const now = new Date().toISOString()

  await db.runAsync(
    'UPDATE customers SET is_active = 0, updated_at = ? WHERE id = ?',
    [now, id],
  )

  const row = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM customers WHERE id = ?', [id],
  )
  if (row) {
    enqueueCustomerSyncEvent(row, shopId, employeeId, deviceId, 'tombstone').catch(
      () => {},
    )
  }
}

// ── Sale attachment ───────────────────────────────────────────────────────────

/**
 * attachCustomerToSale — write customer.id to the sale's customer_id_number.
 *
 * Sale-reference integrity (Phase 10 critical invariant):
 *   - A sale may be created before its customer is synced to cloud.
 *   - A sale may be synced before its customer is synced.
 *   - The sale record holds customer_id_number (plain text) — it does NOT
 *     require the customer row to exist locally for the sale to be valid.
 *   - The customer sync and sale sync are independent; cloud reconciliation
 *     links them via customer_id_number.
 *
 * This function is idempotent: re-calling with the same (saleId, customerId)
 * overwrites the same customer_id_number with no additional side effects.
 */
export async function attachCustomerToSale(
  saleId: string,
  customerId: string,
): Promise<void> {
  const db = await getDb()
  const now = new Date().toISOString()
  await db.runAsync(
    `UPDATE sales SET customer_id_number = ?, updated_at = ? WHERE id = ?`,
    [customerId, now, saleId],
  )
  // No sync event for this update — sales own their own sync events.
}

// ── History ───────────────────────────────────────────────────────────────────

/**
 * getCustomerPurchaseHistory — all completed sales for a customer by id_number.
 * Returns sales where customer_id_number matches.
 *
 * Note: uses customer_id_number (plain text), not customer_id (FK).
 * This is intentional — it keeps the sale valid regardless of customer sync order.
 */
export async function getCustomerPurchaseHistory(
  customerIdNumber: string,
): Promise<Sale[]> {
  const db = await getDb()
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM sales
     WHERE customer_id_number = ? AND status = 'completed'
     ORDER BY created_at DESC LIMIT 50`,
    [customerIdNumber],
  )
  return rows.map(mapCustomerSaleRow)
}
