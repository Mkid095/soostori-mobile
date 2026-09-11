// pos-checkout-modal.tsx — Cart review + payment method selection + LAN sync orchestration
import { useState, useEffect, useRef } from 'react'
import { View, Text, TouchableOpacity, Modal } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { CartItem, Product, ShopSettings } from '../../lib/types'
import { useTheme } from '../../hooks/useTheme'
import { ReceiptView } from './receipt-view'
import { CartView } from './pos-checkout-cart-view'
import { PaymentMethodSelector } from './pos-checkout-payment-selector'
import { PendingSaleView } from './pos-checkout-pending-view'
import { SaleRejectedView } from './pos-checkout-error-view'
import { usePaymentMethods } from './usePaymentMethods'
import { useSaleLanEvents } from '../../hooks/useSaleLanEvents'
import { lanClient } from '../../services/lan-client'
import { requestStkPush, queryStkStatus, validateMpesaReceipt } from '../../services/mpesa-service'

interface Props {
  visible: boolean
  cart: CartItem[]
  products: Product[]
  shopSettings: ShopSettings | null
  onClose: () => void
  onComplete: () => void
  onUpdateCart: (cart: CartItem[]) => void
}

type CheckoutStep = 'cart' | 'payment' | 'pending' | 'success' | 'error'

export function PosCheckoutModal({ visible, cart, products, shopSettings, onClose, onComplete, onUpdateCart }: Props) {
  const { bg, card, text, textSecondary, border, brand } = useTheme()
  const paymentMethods = usePaymentMethods(shopSettings)

  const [step, setStep] = useState<CheckoutStep>('cart')
  const [selectedPayment, setSelectedPayment] = useState<'cash' | 'sendMoney' | 'mpesaPaybill' | 'bankPaybill' | 'pochi' | 'debt'>('cash')
  // mpesaStatus: idle → input → requesting → polling → success | error
  const [mpesaStatus, setMpesaStatus] = useState<'idle' | 'input' | 'requesting' | 'polling' | 'completed' | 'error'>('idle')
  const [mpesaPhone, setMpesaPhone] = useState('')
  const [mpesaReceipt, setMpesaReceipt] = useState<string | null>(null)
  const [mpesaError, setMpesaError] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [completedSale, setCompletedSale] = useState<{ receipt: import('../../services/db-receipts').ReceiptData } | null>(null)
  const [pendingSaleId, setPendingSaleId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  useSaleLanEvents(
    pendingSaleId,
    cart,
    shopSettings,
    (receipt) => { setCompletedSale({ receipt }); setStep('success') },
    (reason) => { setErrorMsg(reason); setStep('error') },
  )

  // Poll M-Pesa STK push status every 3s for up to 60s
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollCountRef = useRef(0)

  useEffect(() => {
    if (mpesaStatus !== 'polling') {
      if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null }
      pollCountRef.current = 0
      return
    }
    pollingRef.current = setInterval(async () => {
      pollCountRef.current += 1
      if (pollCountRef.current >= 20) {
        clearInterval(pollingRef.current!)
        pollingRef.current = null
        setMpesaError('Payment timed out. Please try again.')
        setMpesaStatus('error')
        return
      }
      try {
        // checkoutRequestId is stored in mpesaReceipt as a temporary holder during polling
        const status = await queryStkStatus(mpesaReceipt ?? 'pending')
        if (status === 'completed') {
          clearInterval(pollingRef.current!)
          pollingRef.current = null
          const receipt = await validateMpesaReceipt(mpesaReceipt ?? '')
          setMpesaReceipt(receipt)
          setMpesaStatus('completed')
        } else if (status === 'failed') {
          clearInterval(pollingRef.current!)
          pollingRef.current = null
          setMpesaError('M-Pesa payment failed. Please try again.')
          setMpesaStatus('error')
        }
        // else 'pending' — keep polling
      } catch {
        // network error — keep polling
      }
    }, 3000)
    return () => { if (pollingRef.current) clearInterval(pollingRef.current) }
  }, [mpesaStatus])

  const cartTotal = cart.reduce((s, i) => s + i.totalPrice, 0)
  const isMpesa = selectedPayment !== 'cash' && selectedPayment !== 'debt'
  const canConfirm = !isMpesa || mpesaStatus === 'completed'

  function add(productId: string) {
    const product = products.find((p) => p.id === productId)
    if (!product) return
    const existing = cart.find((c) => c.productId === productId)
    if (existing) {
      onUpdateCart(cart.map((c) => c.productId === productId ? { ...c, quantity: c.quantity + 1, totalPrice: (c.quantity + 1) * c.unitPrice } : c))
    } else {
      onUpdateCart([...cart, { productId: product.id, productName: product.name, quantity: 1, unitPrice: product.sellingPrice, totalPrice: product.sellingPrice, discount: 0 }])
    }
  }

  function remove(productId: string) {
    const existing = cart.find((c) => c.productId === productId)
    if (existing && existing.quantity > 1) {
      onUpdateCart(cart.map((c) => c.productId === productId ? { ...c, quantity: c.quantity - 1, totalPrice: (c.quantity - 1) * c.unitPrice } : c))
    } else {
      onUpdateCart(cart.filter((c) => c.productId !== productId))
    }
  }

  async function handleComplete() {
    if (cart.length === 0 || !canConfirm) return
    setIsProcessing(true)
    try {
      const dbMethod: 'cash' | 'mpesa' | 'card' | 'transfer' | 'mobile_money' | 'debt' = isMpesa ? 'mpesa' : selectedPayment
      const isConnected = lanClient.isConnected()
      if (isConnected) {
        const { generateId } = await import('../../lib/formatters')
        const saleId = generateId()
        const now = new Date().toISOString()
        const { buildReceiptData } = await import('../../services/db-receipts')
        const receipt = buildReceiptData(cart, shopSettings, dbMethod, saleId)
        setCompletedSale({ receipt })
        setStep('success')
      } else {
        const { createSaleOffline } = await import('../../services/db-sales')
        const sale = await createSaleOffline(cart, dbMethod, cartTotal, 0, cartTotal)
        const { buildReceiptData } = await import('../../services/db-receipts')
        const receipt = buildReceiptData(cart, shopSettings, dbMethod, sale.id)
        setCompletedSale({ receipt })
        setStep('success')
      }
    } catch (err) {
      const { Alert } = await import('react-native')
      if (err instanceof Error && err.message.includes('stock')) {
        Alert.alert('Insufficient Stock', err.message)
      } else {
        Alert.alert('Error', 'Failed to complete sale')
      }
    } finally { setIsProcessing(false) }
  }

  function handleReceiptClose() { setCompletedSale(null); setStep('cart'); onComplete() }
  function handleErrorRetry() { setMpesaStatus('idle'); setMpesaError(''); setMpesaPhone(''); setStep('payment') }

  async function handleMpesaRequest(phone: string) {
    setMpesaPhone(phone)
    setMpesaStatus('requesting')
    try {
      const { generateId } = await import('../../lib/formatters')
      const saleId = generateId()
      const { checkoutRequestId } = await requestStkPush(phone, cartTotal, saleId)
      // Store checkoutRequestId as mpesaReceipt temporarily — used as poll key
      setMpesaReceipt(checkoutRequestId)
      setMpesaStatus('polling')
    } catch (err) {
      setMpesaError('Failed to send M-Pesa request. Please try again.')
      setMpesaStatus('error')
    }
  }

  if (completedSale && step === 'success') {
    return <Modal visible={visible} animationType="slide"><SafeAreaView style={{ flex: 1, backgroundColor: bg }}><ReceiptView receipt={completedSale.receipt} onClose={handleReceiptClose} /></SafeAreaView></Modal>
  }
  if (step === 'pending') {
    return <Modal visible={visible} animationType="slide"><SafeAreaView style={{ flex: 1, backgroundColor: bg }}><PendingSaleView onCancel={() => { setStep('payment'); setPendingSaleId(null) }} bg={bg} card={card} text={text} textSecondary={textSecondary} border={border} brand={brand} /></SafeAreaView></Modal>
  }
  if (step === 'error') {
    return <Modal visible={visible} animationType="slide"><SafeAreaView style={{ flex: 1, backgroundColor: bg }}><SaleRejectedView errorMsg={errorMsg} onRetry={handleErrorRetry} brand={brand} text={text} muted={textSecondary} /></SafeAreaView></Modal>
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>
        <CartView
          cart={cart} products={products}
          onAdd={add} onRemove={remove}
          onSelectPayment={() => setStep('payment')}
          cartTotal={cartTotal}
          onClose={onClose}
          bg={bg} card={card} text={text} textSecondary={textSecondary} border={border} brand={brand}
        />
      </SafeAreaView>
      <Modal visible={step === 'payment'} animationType="slide" onRequestClose={() => setStep('cart')}>
        <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>
          <PaymentMethodSelector
            paymentMethods={paymentMethods}
            selectedPayment={selectedPayment}
            onSelectPayment={(p) => { setSelectedPayment(p); setMpesaStatus('idle') }}
            isMpesa={isMpesa} shopSettings={shopSettings}
            mpesaStatus={mpesaStatus} mpesaPhone={mpesaPhone} mpesaError={mpesaError}
            onMpesaRequest={handleMpesaRequest}
            cartTotal={cartTotal} isProcessing={isProcessing} canConfirm={canConfirm}
            onBack={() => setStep('cart')} onComplete={handleComplete}
            bg={bg} card={card} text={text} textSecondary={textSecondary} border={border} brand={brand}
          />
        </SafeAreaView>
      </Modal>
    </Modal>
  )
}
