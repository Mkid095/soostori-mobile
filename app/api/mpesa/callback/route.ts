// app/api/mpesa/callback/route.ts — PayHero STK Push webhook handler
// Receives async payment result from PayHero and updates local SQLite state.

import { handleStkCallback } from '../../../../src/services/mpesa-service'

function getWebhookToken(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Constants = require('expo-constants').default
    return Constants?.expoConfig?.extra?.payheroWebhookToken ?? ''
  } catch {
    return ''
  }
}

// GET: health-check / token verification
export async function GET(): Promise<Response> {
  const token = getWebhookToken()
  const received = typeof process !== 'undefined' && process.env
    ? process.env.PAYHERO_WEBHOOK_TOKEN
    : undefined
  if (token && token !== received) {
    return new Response('Forbidden', { status: 403 })
  }
  return new Response('OK', { status: 200 })
}

// POST: receive PayHero async callback
export async function POST(request: Request): Promise<Response> {
  const token = getWebhookToken()
  const received =
    request.headers.get('x-webhook-token') ??
    new URL(request.url).searchParams.get('token') ??
    ''

  if (token && token !== received) {
    return new Response('Forbidden', { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json() as Record<string, unknown>
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resultCode = Number((body as any).ResultCode ?? (body as any).result_code ?? 1)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const checkoutRequestId = String((body as any).CheckoutRequestID ?? (body as any).checkout_request_id ?? '')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const receiptNumber = String((body as any).ReceiptNumber ?? (body as any).receipt_number ?? '')

  if (!checkoutRequestId) {
    return new Response('Missing checkoutRequestId', { status: 400 })
  }

  // Respond immediately — PayHero requires fast acknowledgment
  // Then update SQLite in background (non-blocking)
  handleStkCallback({ checkoutRequestId, resultCode, receiptNumber }).catch(console.warn)

  return new Response(JSON.stringify({ Acknowledge: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
