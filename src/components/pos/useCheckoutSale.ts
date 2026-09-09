// useCheckoutSale.ts — Sale completion logic for PosCheckoutModal
import { useState, useCallback } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createSale, InsufficientStockError } from '../../services/db-sales'
import { buildReceiptData } from '../../services/db-receipts'
import type { ReceiptData } from '../../services/db-receipts'
import type { CartItem, ShopSettings } from '../../lib/types'
import { lanClient } from '../../services/lan-client'

const EMPLOYEE_ID_KEY = '@soostori:employeeId'
const DEVICE_ID_KEY = '@soostori:deviceId'

export function useCheckoutSale(cart: CartItem[], shopSettings: ShopSettings | null, onComplete: () => void) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [completedSale, setCompletedSale] = useState<ReceiptData | null>(null)

  async function completeSale(
    cart: CartItem[],
    selectedPayment: 'cash' | 'sendMoney' | 'mpesaPaybill' | 'bankPaybill' | 'pochi' | 'debt',
    isMpesa: boolean,
    cartTotal: number,
    onSuccess: (receipt: ReceiptData) => void,
    onPending: (saleId: string) => void,
  ) {
    if (cart.length === 0) return
    setIsProcessing(true)
    try {
      const dbMethod: 'cash' | 'mpesa' | 'card' | 'transfer' | 'mobile_money' | 'debt' = isMpesa ? 'mpesa' : (selectedPayment as 'cash' | 'debt')
      const isConnected = lanClient.isConnected()
      const employeeId = (await AsyncStorage.getItem(EMPLOYEE_ID_KEY)) ?? ''
      const deviceId = (await AsyncStorage.getItem(DEVICE_ID_KEY)) ?? ''

      if (isConnected) {
        const { generateId } = await import('../../lib/formatters')
        const saleId = generateId()
        const now = new Date().toISOString()
        lanClient.emitSalePending({
          saleId,
          items: cart.map((item) => ({ productId: item.productId, variantName: item.variationName, quantity: item.quantity, unitPrice: item.unitPrice, totalPrice: item.totalPrice })),
          totalAmount: cartTotal,
          paymentMethod: dbMethod,
          employeeId,
          deviceId,
          timestamp: now,
        })
        onPending(saleId)
      } else {
        const { createSaleOffline } = await import('../../services/db-sales')
        const sale = await createSaleOffline(cart, dbMethod, cartTotal, 0, cartTotal)
        const receipt = buildReceiptData(cart, shopSettings, dbMethod, sale.id)
        setCompletedSale(receipt)
        onSuccess(receipt)
      }
    } catch (err) {
      if (err instanceof InsufficientStockError) {
        const { Alert } = require('react-native')
        Alert.alert('Insufficient Stock', `Not enough "${err.productName}" in stock. Only ${err.available} available.`)
      } else {
        const { Alert } = require('react-native')
        Alert.alert('Error', 'Failed to complete sale')
      }
    } finally {
      setIsProcessing(false)
    }
  }

  return { isProcessing, completedSale, completeSale }
}
