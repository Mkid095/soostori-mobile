/**
 * inventory-ledger-service.ts — Phase 09
 *
 * Wires @soostori/inventory StockMovementLedger into the mobile app.
 *
 * Single responsible service: all stock-affecting mutations on mobile
 * flow through here. This ensures:
 *   1. Every stock change produces an immutable StockMovement ledger entry
 *   2. balanceAfter is always deterministic (last movement's balanceAfter)
 *   3. Idempotency via idempotencyKey — replay of the same movement is a no-op
 *   4. stock_balances cache stays in sync
 *
 * Used by: db-sale-create.ts, db-sale-offline.ts (the POS services)
 */

import { newId } from '@soostori/core'
import type { UUID } from '@soostori/core'
import { StockMovementLedger } from '@soostori/inventory'
import { MobileInventoryRepository } from '../adapters/inventory/mobile-inventory-repository'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getCurrentShopId } from './session-helper'

const DEVICE_ID_KEY = '@soostori:deviceId'

let _ledger: StockMovementLedger | null = null

/**
 * Resolve the current device ID from AsyncStorage or fall back to shopId.
 */
async function resolveDeviceId(): Promise<UUID> {
  const stored = await AsyncStorage.getItem(DEVICE_ID_KEY)
  return (stored ?? (await getCurrentShopId()) ?? 'mobile-device') as UUID
}

/**
 * Get the singleton StockMovementLedger instance.
 * Lazily initialised on first call after device/shop context is available.
 */
export async function getInventoryLedger(): Promise<StockMovementLedger> {
  if (_ledger) return _ledger

  const shopId = await getCurrentShopId()
  if (!shopId) throw new Error('No shop context — cannot create inventory ledger')

  const deviceId = await resolveDeviceId()
  const repo = new MobileInventoryRepository()
  _ledger = new StockMovementLedger(repo, shopId as UUID, deviceId)
  return _ledger
}

/**
 * Deduct stock for a sale item via the ledger.
 *
 * Calls StockMovementLedger.apply() which:
 *   - Checks idempotencyKey → no-op if already applied
 *   - Reads current balance from stock_balances (or derives from movements)
 *   - Appends movement to inventory_transactions
 *   - Updates stock_balances
 *
 * @param saleId         — referenceId on the movement
 * @param productId      — product being sold
 * @param quantity        — quantity sold (positive number)
 * @param idempotencyKey — unique per sale-item to prevent double-deduction
 */
export async function deductSaleStock(
  saleId: string,
  productId: string,
  quantity: number,
  idempotencyKey?: string,
): Promise<void> {
  const ledger = await getInventoryLedger()
  await ledger.apply({
    productId: productId as UUID,
    productVariantId: null,
    type: 'sold',
    quantity: -Math.abs(quantity), // negative delta
    referenceId: saleId,
    referenceType: 'sale',
    actorType: 'employee',
    idempotencyKey: (idempotencyKey ?? `${saleId}:${productId}`) as UUID,
  })
}

/**
 * Reverse a sale stock deduction (sale cancelled).
 *
 * Produces a 'released' movement that restores the balance.
 * Idempotent: same idempotencyKey re-reversing is a no-op.
 */
export async function reverseSaleStock(
  saleId: string,
  productId: string,
  quantity: number,
  idempotencyKey?: string,
): Promise<void> {
  const ledger = await getInventoryLedger()
  await ledger.apply({
    productId: productId as UUID,
    productVariantId: null,
    type: 'released',
    quantity: Math.abs(quantity), // positive delta (restore)
    referenceId: saleId,
    referenceType: 'sale',
    actorType: 'employee',
    idempotencyKey: (idempotencyKey ?? `${saleId}:${productId}:cancel`) as UUID,
  })
}

/**
 * Refund sale stock — produces a 'refunded' movement that restores the balance.
 *
 * Unlike reverseSaleStock (used for void/cancel), this is used for customer refunds.
 * Idempotent: same idempotencyKey re-refunding is a no-op.
 */
export async function refundSaleStock(
  saleId: string,
  productId: string,
  quantity: number,
  idempotencyKey?: string,
): Promise<void> {
  const ledger = await getInventoryLedger()
  await ledger.apply({
    productId: productId as UUID,
    productVariantId: null,
    type: 'refunded',
    quantity: Math.abs(quantity), // positive delta (restore)
    referenceId: saleId,
    referenceType: 'sale',
    actorType: 'employee',
    idempotencyKey: (idempotencyKey ?? `${saleId}:${productId}:refund`) as UUID,
  })
}

/**
 * Adjust stock manually (stock count correction).
 */
export async function adjustStock(
  productId: string,
  quantity: number, // signed delta
  reason: string,
  actorId?: string,
): Promise<void> {
  const ledger = await getInventoryLedger()
  await ledger.apply({
    productId: productId as UUID,
    productVariantId: null,
    type: 'adjusted',
    quantity,
    reason,
    actorType: 'employee',
    actorId: actorId as UUID | undefined,
    idempotencyKey: newId() as UUID,
  })
}
