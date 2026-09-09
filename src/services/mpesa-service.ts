// mpesa-service.ts — M-Pesa STK push integration
// TODO (real integration): Replace mock implementations with Safaricom Lipa Na M-Pesa Online API
// Endpoint: POST https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest
// Auth: OAuth2 Bearer token from https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials

export interface StkPushResult {
  checkoutRequestId: string
  merchantRequestId: string
}

export type StkPaymentStatus = 'pending' | 'success' | 'failed'

/**
 * Initiates an M-Pesa STK push request.
 * Real implementation: POST to Safaricom M-Pesa API with consumer key/secret auth.
 */
export async function requestStkPush(
  phone: string,
  amount: number,
  saleId: string,
): Promise<StkPushResult> {
  // TODO (real integration): Replace with actual Safaricom API call
  // const token = await getMpesaAccessToken()
  // const response = await fetch('https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest', {
  //   headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  //   method: 'POST',
  //   body: JSON.stringify({ BusinessShortCode, Password, Timestamp, TransactionType, Amount: String(amount),
  //     PartyA: phone, PartyB: BusinessShortCode, PhoneNumber: phone, CallBackURL, AccountReference: saleId, TransactionDesc: `Sale ${saleId}` }),
  // })
  // const data = await response.json()
  // return { checkoutRequestId: data.CheckoutRequestID, merchantRequestId: data.MerchantRequestID }

  await new Promise((r) => setTimeout(r, 800))
  const checkoutRequestId = `CHK${Date.now()}`
  const merchantRequestId = `MKR${Date.now()}`
  return { checkoutRequestId, merchantRequestId }
}

/**
 * Queries the status of an M-Pesa STK push payment.
 * Real implementation: POST to Safaricom M-Pesa API query endpoint.
 */
export async function queryStkStatus(checkoutRequestId: string): Promise<StkPaymentStatus> {
  // TODO (real integration): Replace with actual Safaricom API call
  // const token = await getMpesaAccessToken()
  // const response = await fetch('https://api.safaricom.co.ke/mpesa/stkpushquery/v1/query', {
  //   headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  //   method: 'POST',
  //   body: JSON.stringify({ BusinessShortCode, CheckoutRequestID: checkoutRequestId, Password, Timestamp }),
  // })
  // const data = await response.json()
  // return data.ResultCode === '0' ? 'success' : data.ResultCode === 'xxxx' ? 'pending' : 'failed'

  await new Promise((r) => setTimeout(r, 500))
  // Simulate: random success after first few polls
  const rand = Math.random()
  if (rand < 0.6) return 'success'
  if (rand < 0.85) return 'pending'
  return 'failed'
}

/**
 * Validates and retrieves the M-Pesa receipt number for a successful transaction.
 * Real implementation: Query the transaction result from Safaricom or our own records.
 */
export async function validateMpesaReceipt(checkoutRequestId: string): Promise<string> {
  // TODO (real integration): Look up receipt from transaction records / Safaricom result callback
  // const response = await fetch(`${API_BASE}/transactions/${checkoutRequestId}/receipt`)
  // return response.receiptNumber

  await new Promise((r) => setTimeout(r, 300))
  return `MPS${Date.now().toString().slice(-8)}`
}
