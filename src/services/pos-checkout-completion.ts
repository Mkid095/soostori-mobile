// pos-checkout-completion.ts — Persist + LAN-notify for POS sale completion (P0-9)
// P0-9 fix: the LAN-connected path previously skipped local persistence AND
// never notified the host. Cash could be taken for a sale that didn't exist
// anywhere. This service is the single point of truth for sale completion:
// local SQLite persist is the source of truth; LAN emit is a best-effort
// notification for stock reconciliation, never a persistence layer.

import AsyncStorage from '@react-native-async-storage/async-storage'
import { createSaleOffline } from './db-sale-offline'
import { buildReceiptData } from './db-receipts'
import type { ReceiptData } from './db-receipts'
import { lanClient } from './lan-client'
import type { CartItem, Sale, ShopSettings } from '../lib/types'

const EMPLOYEE_ID_KEY = '@soostori:employeeId'
const DEVICE_ID_KEY = '@soostori:deviceId'
const DEFAULT_EMPLOYEE_ID = 'system'
const DEFAULT_DEVICE_ID = 'mobile'

export interface CompletePosCheckoutResult {
  sale: Sale
  receipt: ReceiptData
  /** True if `lanClient.emitSalePending` returned without throwing. */
  lanEmitted: boolean
  /** Populated when LAN emit threw — local persist already succeeded. */
  lanEmitError?: unknown
}

export interface CompletePosCheckoutParams {
  cart: CartItem[]
  paymentMethod: Sale['paymentMethod']
  cartTotal: number
  shopSettings: ShopSettings | null
}

/**
 * Persist a POS sale locally and (if LAN is connected) notify the host for
 * stock reconciliation. Local persist is the source of truth — failure here
 * throws to the caller and the receipt is NEVER shown. LAN emit failure is
 * non-fatal: the sale is already in SQLite, the cloud sync engine will
 * reconcile the host on the next push, and the user sees a successful receipt.
 *
 * The order is: persist → emit → build receipt. Step 1 is mandatory; step 2
 * is best-effort; step 3 only runs after step 1 succeeds.
 */
export async function completePosCheckout(
  params: CompletePosCheckoutParams,
): Promise<CompletePosCheckoutResult> {
  const { cart, paymentMethod, cartTotal, shopSettings } = params

  // Step 1 — persist. Throws on SQLite failure, RBAC denial, subscription
  // block, or stock gate. The caller must NOT show a receipt in that case.
  const sale = await createSaleOffline(cart, paymentMethod, cartTotal, 0, cartTotal)

  // Step 2 — LAN notify. Sale is already in SQLite. If the socket dropped or
  // the host is offline, we must not lose the user's successful purchase.
  let lanEmitted = false
  let lanEmitError: unknown
  if (lanClient.isConnected()) {
    try {
      const employeeId =
        (await AsyncStorage.getItem(EMPLOYEE_ID_KEY)) ?? DEFAULT_EMPLOYEE_ID
      const deviceId =
        (await AsyncStorage.getItem(DEVICE_ID_KEY)) ?? DEFAULT_DEVICE_ID
      lanClient.emitSalePending({
        saleId: sale.id,
        items: cart.map((item) => ({
          productId: item.productId,
          variantName: item.variationName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
        })),
        totalAmount: sale.totalAmount,
        paymentMethod,
        employeeId,
        deviceId,
        timestamp: sale.createdAt,
      })
      lanEmitted = true
    } catch (err) {
      lanEmitError = err
    }
  }

  // Step 3 — build receipt. Runs only after step 1 succeeded. If step 2
  // failed, the caller will surface a warning but still show the receipt.
  const receipt = buildReceiptData(cart, shopSettings, paymentMethod, sale.id)

  return { sale, receipt, lanEmitted, lanEmitError }
}
