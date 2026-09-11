// mpesa-service.ts — M-Pesa STK Push public API
// Phase 18: refactored (PayHero client moved to mpesa-payhero-client.ts, types to mpesa-types.ts)
import { getDb } from '../lib/db'
import { payHeroRequestStkPush, payHeroQueryStkStatus } from './mpesa-payhero-client'
import type { StkPushRequest, StkPushResponse, StkPaymentStatus } from './mpesa-types'

// ─── SQLite state helpers ────────────────────────────────────────────────────

async function initStkPushTable(): Promise<void> {
  const db = await getDb()
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS stk_push_state (
      id                   TEXT PRIMARY KEY,
      checkout_request_id  TEXT UNIQUE NOT NULL,
      phone                TEXT NOT NULL,
      amount               REAL NOT NULL,
      status               TEXT NOT NULL DEFAULT 'pending',
      receipt_number       TEXT,
      created_at           TEXT NOT NULL,
      completed_at         TEXT
    )
  `)
}

async function persistStkPush(
  req: StkPushRequest,
  checkoutRequestId: string,
): Promise<void> {
  const db = await getDb()
  const { v4: uuid } = await import('uuid')
  await db.runAsync(
    `INSERT OR REPLACE INTO stk_push_state (id, checkout_request_id, phone, amount, status, created_at)
     VALUES (?, ?, ?, ?, 'pending', ?)`,
    [uuid(), checkoutRequestId, req.phone, req.amount, new Date().toISOString()],
  )
}

async function getStkState(checkoutRequestId: string): Promise<{
  status: StkPaymentStatus
  receiptNumber?: string
} | null> {
  const db = await getDb()
  const row = await db.getFirstAsync<{ status: string; receipt_number: string | null }>(
    `SELECT status, receipt_number FROM stk_push_state WHERE checkout_request_id = ?`,
    [checkoutRequestId],
  )
  if (!row) return null
  return { status: row.status as StkPaymentStatus, receiptNumber: row.receipt_number ?? undefined }
}

// ─── Public API ─────────────────────────────────────────────────────────────

export async function requestStkPush(
  phone: string,
  amount: number,
  saleId: string,
): Promise<StkPushResponse> {
  await initStkPushTable()
  const normalised = phone.startsWith('0') ? `254${phone.slice(1)}` : phone
  const req: StkPushRequest = {
    phone: normalised,
    amount,
    accountReference: saleId,
    transactionDesc: `Sale ${saleId}`,
  }

  let checkoutRequestId: string
  try {
    const result = await payHeroRequestStkPush(req, saleId)
    checkoutRequestId = result.checkoutRequestId
  } catch {
    // Offline fallback — persist locally so cashier can retry
    const { v4: uuid } = await import('uuid')
    checkoutRequestId = `offline_${uuid()}`
    await persistStkPush(req, checkoutRequestId)
    throw new Error('PayHero unreachable — request queued for retry')
  }

  await persistStkPush(req, checkoutRequestId)
  return { checkoutRequestId, merchantRequestId: '' }
}

export async function queryStkStatus(checkoutRequestId: string): Promise<StkPaymentStatus> {
  if (checkoutRequestId.startsWith('offline_')) {
    return (await getStkState(checkoutRequestId))?.status ?? 'pending'
  }
  try {
    const result = await payHeroQueryStkStatus(checkoutRequestId)
    return result.status
  } catch {
    return (await getStkState(checkoutRequestId))?.status ?? 'pending'
  }
}

export async function validateMpesaReceipt(checkoutRequestId: string): Promise<string> {
  if (checkoutRequestId.startsWith('offline_')) {
    const state = await getStkState(checkoutRequestId)
    return state?.receiptNumber ?? `OFFLINE_${checkoutRequestId.slice(-8)}`
  }
  const state = await getStkState(checkoutRequestId)
  return state?.receiptNumber ?? `MPS${checkoutRequestId.slice(-8)}`
}

export async function handleStkCallback(payload: {
  checkoutRequestId: string
  resultCode: number
  receiptNumber?: string
}): Promise<void> {
  await initStkPushTable()
  const db = await getDb()
  const status: StkPaymentStatus = payload.resultCode === 0 ? 'completed' : 'failed'
  await db.runAsync(
    `UPDATE stk_push_state SET status = ?, receipt_number = ?, completed_at = ? WHERE checkout_request_id = ?`,
    [status, payload.receiptNumber ?? null, new Date().toISOString(), payload.checkoutRequestId],
  )
}
