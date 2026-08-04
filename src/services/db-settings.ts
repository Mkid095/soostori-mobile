// Shop settings CRUD

import { getDb } from '../lib/db'
import type { ShopSettings, PaymentChannels } from '../lib/types'

const DEFAULT_CHANNELS: PaymentChannels = {
  cash: true,
  mpesaSend: false,
  mpesaPaybill: false,
  bankPaybill: false,
  pochila: false,
}

export async function getShopSettings(): Promise<ShopSettings | null> {
  const db = await getDb()
  const row = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM shop_settings WHERE id = ?', ['default']
  )
  if (!row) return null

  let channels = DEFAULT_CHANNELS
  try {
    const stored = row.enabled_payment_channels as string | undefined
    if (stored) channels = { ...DEFAULT_CHANNELS, ...JSON.parse(stored) }
  } catch { /* use defaults */ }

  return {
    id: String(row.id),
    name: String(row.shop_name || 'My Shop'),
    address: row.address ? String(row.address) : undefined,
    phone: row.phone ? String(row.phone) : undefined,
    currency: String(row.currency || 'KES'),
    receiptFooter: row.receipt_footer ? String(row.receipt_footer) : undefined,
    receiptPrefix: row.receipt_prefix ? String(row.receipt_prefix) : undefined,
    lowStockThreshold: Number(row.low_stock_threshold) || 10,
    mpesaSendMoneyPhone: row.mpesa_send_money_phone ? String(row.mpesa_send_money_phone) : undefined,
    mpesaPaybillNumber: row.mpesa_paybill_number ? String(row.mpesa_paybill_number) : undefined,
    mpesaPaybillAccount: row.mpesa_paybill_account ? String(row.mpesa_paybill_account) : undefined,
    enabledPaymentChannels: channels,
    updatedAt: String(row.updated_at || ''),
  }
}

export async function updateShopSettings(data: Partial<ShopSettings>): Promise<void> {
  const db = await getDb()
  const now = new Date().toISOString()

  const fields: string[] = []
  const values: (string | number)[] = []

  if (data.name !== undefined) { fields.push('shop_name = ?'); values.push(data.name) }
  if (data.address !== undefined) { fields.push('address = ?'); values.push(data.address) }
  if (data.phone !== undefined) { fields.push('phone = ?'); values.push(data.phone) }
  if (data.currency !== undefined) { fields.push('currency = ?'); values.push(data.currency) }
  if (data.receiptFooter !== undefined) { fields.push('receipt_footer = ?'); values.push(data.receiptFooter) }
  if (data.receiptPrefix !== undefined) { fields.push('receipt_prefix = ?'); values.push(data.receiptPrefix) }
  if (data.lowStockThreshold !== undefined) { fields.push('low_stock_threshold = ?'); values.push(data.lowStockThreshold) }
  if (data.mpesaSendMoneyPhone !== undefined) { fields.push('mpesa_send_money_phone = ?'); values.push(data.mpesaSendMoneyPhone) }
  if (data.mpesaPaybillNumber !== undefined) { fields.push('mpesa_paybill_number = ?'); values.push(data.mpesaPaybillNumber) }
  if (data.mpesaPaybillAccount !== undefined) { fields.push('mpesa_paybill_account = ?'); values.push(data.mpesaPaybillAccount) }
  if (data.enabledPaymentChannels !== undefined) {
    fields.push('enabled_payment_channels = ?')
    values.push(JSON.stringify(data.enabledPaymentChannels))
  }

  fields.push('updated_at = ?')
  values.push(now)
  values.push('default')

  await db.runAsync(
    `UPDATE shop_settings SET ${fields.join(', ')} WHERE id = ?`,
    values
  )
}
