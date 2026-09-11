// mpesa-types.ts — All TypeScript interfaces for M-Pesa STK Push
// Phase 18: split from mpesa-service.ts per ANPAS 150-line cap

export interface StkPushRequest {
  phone: string       // 254...
  amount: number       // KES
  accountReference: string
  transactionDesc: string
}

export interface StkPushResponse {
  checkoutRequestId: string
  merchantRequestId: string
}

export type StkPaymentStatus = 'pending' | 'completed' | 'failed'

export interface StkCallbackPayload {
  checkoutRequestId: string
  resultCode: number
  receiptNumber?: string
}

export interface StkStatusResponse {
  status: StkPaymentStatus
  receiptNumber?: string
}
