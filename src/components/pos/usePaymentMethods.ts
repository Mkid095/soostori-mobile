// usePaymentMethods.ts — payment method configuration hook
import { useMemo } from 'react'
import type { ShopSettings } from '../../lib/types'

export type PaymentMethod = 'cash' | 'sendMoney' | 'mpesaPaybill' | 'bankPaybill' | 'pochi' | 'debt'

export function usePaymentMethods(settings: ShopSettings | null) {
  return useMemo(() => {
    const methods: { value: PaymentMethod; label: string }[] = [
      { value: 'cash', label: 'Cash' },
      { value: 'debt',  label: 'Debt' },
    ]
    if (settings?.mpesaSendMoneyPhone) methods.push({ value: 'sendMoney',   label: 'M-Pesa Send Money' })
    if (settings?.mpesaPaybillNumber)  methods.push({ value: 'mpesaPaybill', label: 'M-Pesa Paybill' })
    if (settings?.bankPaybillNumber)   methods.push({ value: 'bankPaybill',  label: 'Bank Paybill' })
    if (settings?.mpesaPochiPhone)    methods.push({ value: 'pochi',        label: 'Pochi La Biashara' })
    return methods
  }, [settings])
}
