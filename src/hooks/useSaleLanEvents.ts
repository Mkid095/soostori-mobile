// useSaleLanEvents.ts — LAN event handlers for sale confirmation/rejection
import { useEffect } from 'react'
import { lanClient } from '../services/lan-client'
import type { SaleConfirmedPayload, SaleRejectedPayload } from '../lib/sync-protocol'
import { buildReceiptData } from '../services/db-receipts'
import type { ReceiptData } from '../services/db-receipts'
import type { CartItem, ShopSettings } from '../lib/types'

export function useSaleLanEvents(
  pendingSaleId: string | null,
  cart: CartItem[],
  shopSettings: ShopSettings | null,
  onSuccess: (receipt: ReceiptData) => void,
  onReject: (reason: string) => void,
) {
  useEffect(() => {
    if (!pendingSaleId) return
    let removed = false

    async function handleSaleConfirmed(payload: SaleConfirmedPayload) {
      if (payload.saleId !== pendingSaleId || removed) return
      removed = true
      const { getSaleById } = await import('../services/db-sales')
      const sale = await getSaleById(pendingSaleId)
      if (!sale) return
      const receipt = buildReceiptData(cart, shopSettings, 'cash', pendingSaleId)
      onSuccess(receipt)
    }

    async function handleSaleRejected(payload: SaleRejectedPayload) {
      if (payload.saleId !== pendingSaleId || removed) return
      removed = true
      onReject(payload.reason)
    }

    const unsubConfirm = lanClient.addEventHandler(async (event) => {
      if (event.eventType === 'SALE_CONFIRMED') await handleSaleConfirmed(JSON.parse(event.payload))
    })
    const unsubReject = lanClient.addEventHandler(async (event) => {
      if (event.eventType === 'SALE_REJECTED') await handleSaleRejected(JSON.parse(event.payload))
    })
    return () => { unsubConfirm(); unsubReject() }
  }, [pendingSaleId])
}
