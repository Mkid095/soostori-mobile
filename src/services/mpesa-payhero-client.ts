// mpesa-payhero-client.ts — PayHero HTTP client for STK Push API
// Phase 18: split from mpesa-service.ts per ANPAS 150-line cap
import type { StkPushRequest } from './mpesa-types'

const PAYHERO_BASE = 'https://payhero.io/api'

function getPayHeroApiKey(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Constants = require('expo-constants').default
    return Constants?.expoConfig?.extra?.payheroApiKey ?? ''
  } catch {
    return ''
  }
}

// ─── POST helper ─────────────────────────────────────────────────────────────

export async function payHeroPost(
  path: string,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const apiKey = getPayHeroApiKey()
  if (!apiKey) throw new Error('PAYYAHERO_API_KEY not configured')
  const response = await fetch(`${PAYHERO_BASE}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`PayHero error ${response.status}: ${text}`)
  }
  return response.json() as Promise<Record<string, unknown>>
}

// ─── GET helper ──────────────────────────────────────────────────────────────

export async function payHeroGet(path: string): Promise<Record<string, unknown>> {
  const apiKey = getPayHeroApiKey()
  if (!apiKey) throw new Error('PAYYAHERO_API_KEY not configured')
  const response = await fetch(`${PAYHERO_BASE}${path}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`PayHero error ${response.status}: ${text}`)
  }
  return response.json() as Promise<Record<string, unknown>>
}

// ─── Request STK push ────────────────────────────────────────────────────────

export async function payHeroRequestStkPush(
  req: StkPushRequest,
  saleId: string,
): Promise<{ checkoutRequestId: string }> {
  const payload = {
    phone: req.phone,
    amount: req.amount,
    account_reference: req.accountReference,
    transaction_description: req.transactionDesc,
  }
  const result = await payHeroPost('/payment', payload)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const checkoutRequestId = String((result as any).checkoutRequestId ?? (result as any).checkout_request_id ?? '')
  if (!checkoutRequestId) throw new Error('No checkoutRequestId in PayHero response')
  return { checkoutRequestId }
}

// ─── Query STK status ─────────────────────────────────────────────────────────

export async function payHeroQueryStkStatus(checkoutRequestId: string): Promise<{
  status: 'pending' | 'completed' | 'failed'
  receiptNumber?: string
}> {
  const result = await payHeroGet(`/payment/${checkoutRequestId}`)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const status = String((result as any).status ?? '')
  if (status === 'completed' || status === 'success') return { status: 'completed', receiptNumber: (result as any).receiptNumber }
  if (status === 'failed' || status === 'timeout') return { status: 'failed' }
  return { status: 'pending' }
}
