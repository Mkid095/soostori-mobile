// pos-checkout-modal.tsx — Cart review + payment method selection + LAN sync
// On "Complete Sale": emit SALE_PENDING → wait for SALE_CONFIRMED/SALE_REJECTED
// If offline: create sale with pending_offline status
import { useState, useMemo, useEffect, useRef } from 'react'
import { View, Text, FlatList, TouchableOpacity, Modal, ScrollView, Alert, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { CartItem, Sale, Product, ShopSettings } from '../../lib/types'
import { createSale, InsufficientStockError } from '../../services/db-sales'
import { buildReceiptData } from '../../services/db-receipts'
import type { ReceiptData } from '../../services/db-receipts'
import { formatCurrency } from '../../lib/formatters'
import { useTheme } from '../../hooks/useTheme'
import { ReceiptView } from './receipt-view'
import { lanClient } from '../../services/lan-client'
import type { SaleConfirmedPayload, SaleRejectedPayload } from '../../lib/sync-protocol'

const EMPLOYEE_ID_KEY = '@soostori:employeeId'
const DEVICE_ID_KEY = '@soostori:deviceId'

interface Props {
  visible: boolean
  cart: CartItem[]
  products: Product[]
  shopSettings: ShopSettings | null
  onClose: () => void
  onComplete: () => void
  onUpdateCart: (cart: CartItem[]) => void
}

type PaymentMethod = 'cash' | 'sendMoney' | 'mpesaPaybill' | 'bankPaybill' | 'pochi' | 'debt'
type CheckoutStep = 'cart' | 'payment' | 'pending' | 'success' | 'error'

function usePaymentMethods(settings: ShopSettings | null) {
  return useMemo(() => {
    const methods: { value: PaymentMethod; label: string }[] = [
      { value: 'cash', label: 'Cash' },
      { value: 'debt',  label: 'Debt' },
    ]
    if (settings?.mpesaSendMoneyPhone) methods.push({ value: 'sendMoney',   label: 'M-Pesa Send Money' })
    if (settings?.mpesaPaybillNumber)  methods.push({ value: 'mpesaPaybill', label: 'M-Pesa Paybill' })
    if (settings?.bankPaybillNumber)   methods.push({ value: 'bankPaybill',  label: 'Bank Paybill' })
    if (settings?.mpesaPochiPhone)     methods.push({ value: 'pochi',        label: 'Pochi La Biashara' })
    return methods
  }, [settings])
}

function MpesaDetails({ method, settings }: { method: PaymentMethod; settings: ShopSettings }) {
  const { card, text, textSecondary: textMuted, border } = useTheme()
  const infoStyle = { backgroundColor: card, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: border }
  const labelStyle: object = { fontSize: 11, fontWeight: '700' as const, color: textMuted, textTransform: 'uppercase' as const, letterSpacing: 0.5 }
  const valueStyle: object = { fontSize: 16, fontWeight: '800' as const, color: text }

  if (method === 'sendMoney' || method === 'pochi') {
    const phone = method === 'sendMoney' ? settings.mpesaSendMoneyPhone : settings.mpesaPochiPhone
    return (
      <View style={infoStyle}>
        <Text style={labelStyle}>{method === 'pochi' ? 'Pochi Phone' : 'Send Money To'}</Text>
        <Text style={{ ...valueStyle, marginTop: 4 }}>{phone}</Text>
        <Text style={{ fontSize: 12, color: textMuted, marginTop: 6 }}>
          Customer should send {method === 'pochi' ? 'via Pochi' : 'money'} to the number above
        </Text>
      </View>
    )
  }
  if (method === 'mpesaPaybill' || method === 'bankPaybill') {
    const num = method === 'mpesaPaybill' ? settings.mpesaPaybillNumber : settings.bankPaybillNumber
    const acc = method === 'mpesaPaybill' ? settings.mpesaPaybillAccount : settings.bankPaybillAccount
    return (
      <View style={infoStyle}>
        <Text style={labelStyle}>{method === 'bankPaybill' ? 'Bank Paybill' : 'Paybill Number'}</Text>
        <Text style={{ ...valueStyle, marginTop: 4 }}>{num}</Text>
        <Text style={{ ...labelStyle, marginTop: 10 }}>Account Number</Text>
        <Text style={{ ...valueStyle, marginTop: 4 }}>{acc}</Text>
        <Text style={{ fontSize: 12, color: textMuted, marginTop: 6 }}>
          Customer should pay to {num} account {acc}
        </Text>
      </View>
    )
  }
  return null
}

export function PosCheckoutModal({ visible, cart, products, shopSettings, onClose, onComplete, onUpdateCart }: Props) {
  const { bg, card, text, textSecondary, border, brand } = useTheme()
  const paymentMethods = usePaymentMethods(shopSettings)

  const [step, setStep] = useState<CheckoutStep>('cart')
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>('cash')
  const [mpesaConfirmed, setMpesaConfirmed] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [completedSale, setCompletedSale] = useState<ReceiptData | null>(null)
  const [pendingSaleId, setPendingSaleId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [employeeId, setEmployeeId] = useState<string>('')
  const [deviceId, setDeviceId] = useState<string>('')

  useEffect(() => {
    AsyncStorage.getItem(EMPLOYEE_ID_KEY).then((v) => setEmployeeId(v ?? ''))
    AsyncStorage.getItem(DEVICE_ID_KEY).then((v) => setDeviceId(v ?? ''))
  }, [])

  // Listen for sale confirmation/rejection from LAN client
  useEffect(() => {
    if (step !== 'pending' || !pendingSaleId) return

    let removed = false

    async function handleSaleConfirmed(payload: SaleConfirmedPayload) {
      if (payload.saleId !== pendingSaleId) return
      if (removed) return
      removed = true

      // Fetch the confirmed sale from DB and show receipt
      const { getSaleById } = await import('../../services/db-sales')
      const sale = await getSaleById(pendingSaleId)
      if (!sale) return

      const dbMethod: Sale['paymentMethod'] = (completedSale?.paymentMethod as Sale['paymentMethod']) ?? 'cash'
      const receipt = buildReceiptData(cart, shopSettings, dbMethod, pendingSaleId)
      setCompletedSale(receipt)
      setStep('success')
    }

    async function handleSaleRejected(payload: SaleRejectedPayload) {
      if (payload.saleId !== pendingSaleId) return
      if (removed) return
      removed = true

      setErrorMsg(payload.reason)
      setStep('error')
    }

    // Register handlers via lanClient event system
    const unsubConfirm = lanClient.addEventHandler(async (event) => {
      if (event.eventType === 'SALE_CONFIRMED') {
        await handleSaleConfirmed(JSON.parse(event.payload))
      }
    })
    const unsubReject = lanClient.addEventHandler(async (event) => {
      if (event.eventType === 'SALE_REJECTED') {
        await handleSaleRejected(JSON.parse(event.payload))
      }
    })

    return () => {
      unsubConfirm()
      unsubReject()
    }
  }, [step, pendingSaleId, cart, shopSettings])

  const cartTotal = cart.reduce((s, i) => s + i.totalPrice, 0)
  const isMpesa = selectedPayment !== 'cash' && selectedPayment !== 'debt'
  const canConfirm = !isMpesa || mpesaConfirmed

  function add(productId: string) {
    const product = products.find((p) => p.id === productId)
    if (!product) return
    const existing = cart.find((c) => c.productId === productId)
    if (existing) {
      onUpdateCart(cart.map((c) => c.productId === productId
        ? { ...c, quantity: c.quantity + 1, totalPrice: (c.quantity + 1) * c.unitPrice } : c))
    } else {
      onUpdateCart([...cart, { productId: product.id, productName: product.name, quantity: 1,
        unitPrice: product.sellingPrice, totalPrice: product.sellingPrice, discount: 0 }])
    }
  }

  function remove(productId: string) {
    const existing = cart.find((c) => c.productId === productId)
    if (existing && existing.quantity > 1) {
      onUpdateCart(cart.map((c) => c.productId === productId
        ? { ...c, quantity: c.quantity - 1, totalPrice: (c.quantity - 1) * c.unitPrice } : c))
    } else {
      onUpdateCart(cart.filter((c) => c.productId !== productId))
    }
  }

  async function handleComplete() {
    if (cart.length === 0 || !canConfirm) return
    setIsProcessing(true)

    try {
      const dbMethod: Sale['paymentMethod'] = isMpesa ? 'mpesa' : selectedPayment
      const isConnected = lanClient.isConnected()

      if (isConnected) {
        // Generate a temporary ID for the pending sale
        const { generateId } = await import('../../lib/formatters')
        const saleId = generateId()
        const now = new Date().toISOString()

        // Emit SALE_PENDING to host and wait
        lanClient.emitSalePending({
          saleId,
          items: cart.map((item) => ({
            productId: item.productId,
            variantName: item.variationName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
          })),
          totalAmount: cartTotal,
          paymentMethod: dbMethod,
          employeeId,
          deviceId,
          timestamp: now,
        })

        setPendingSaleId(saleId)
        setStep('pending')
      } else {
        // Offline: create sale with pending_offline status, queue event
        const { createSaleOffline } = await import('../../services/db-sales')
        const sale = await createSaleOffline(cart, dbMethod, cartTotal, 0, cartTotal)
        const receipt = buildReceiptData(cart, shopSettings, dbMethod, sale.id)
        setCompletedSale(receipt)
        setStep('success')
      }
    } catch (err) {
      if (err instanceof InsufficientStockError) {
        Alert.alert('Insufficient Stock', `Not enough "${err.productName}" in stock. Only ${err.available} available.`)
      } else {
        Alert.alert('Error', 'Failed to complete sale')
      }
    } finally {
      setIsProcessing(false)
    }
  }

  function handleReceiptClose() {
    setCompletedSale(null)
    setStep('cart')
    onComplete()
  }

  function handleErrorRetry() {
    setStep('payment')
    setErrorMsg('')
  }

  if (completedSale && step === 'success') {
    return (
      <Modal visible={visible} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>
          <ReceiptView receipt={completedSale} onClose={handleReceiptClose} />
        </SafeAreaView>
      </Modal>
    )
  }

  // Pending state — waiting for host confirmation
  if (step === 'pending') {
    return (
      <Modal visible={visible} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 20 }}>
            <ActivityIndicator size="large" color={brand} />
            <Text style={{ fontSize: 18, fontWeight: '800', color: text }}>Waiting for approval…</Text>
            <Text style={{ fontSize: 14, color: textSecondary, textAlign: 'center' }}>
              Request sent to shop computer. Please wait.
            </Text>
            <TouchableOpacity
              style={{ backgroundColor: card, borderWidth: 1, borderColor: border, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10 }}
              onPress={() => { setStep('payment'); setPendingSaleId(null) }}
            >
              <Text style={{ color: text, fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    )
  }

  // Error state — sale rejected
  if (step === 'error') {
    return (
      <Modal visible={visible} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 20 }}>
            <Text style={{ fontSize: 40 }}>❌</Text>
            <Text style={{ fontSize: 18, fontWeight: '800', color: text }}>Sale Rejected</Text>
            <Text style={{ fontSize: 14, color: textSecondary, textAlign: 'center' }}>{errorMsg}</Text>
            <TouchableOpacity
              style={{ backgroundColor: brand, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12 }}
              onPress={handleErrorRetry}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    )
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: border, backgroundColor: card }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: text }}>Cart ({cart.length})</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ color: brand, fontWeight: '700', fontSize: 15 }}>Close</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={cart}
          keyExtractor={(i) => i.productId}
          contentContainerStyle={{ padding: 12, paddingBottom: 160 }}
          renderItem={({ item }) => {
            const product = products.find((p) => p.id === item.productId)
            const stockOk = !product?.trackInventory || item.quantity <= (product?.stockQuantity ?? 0)
            return (
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: card, borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: stockOk ? border : '#f59e0b' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '700', color: text, fontSize: 14 }}>{item.productName}</Text>
                  <Text style={{ color: textSecondary, fontSize: 12 }}>{formatCurrency(item.unitPrice)} each</Text>
                  {!stockOk && (
                    <Text style={{ color: '#f59e0b', fontSize: 11, fontWeight: '600', marginTop: 2 }}>
                      Only {product?.stockQuantity ?? 0} in stock
                    </Text>
                  )}
                </View>
                <TouchableOpacity onPress={() => remove(item.productId)} style={{ backgroundColor: bg, width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ color: text, fontWeight: '700', fontSize: 18 }}>−</Text>
                </TouchableOpacity>
                <Text style={{ fontWeight: '800', color: text, fontSize: 16, minWidth: 24, textAlign: 'center' }}>{item.quantity}</Text>
                <TouchableOpacity onPress={() => add(item.productId)} style={{ backgroundColor: brand, width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 18 }}>+</Text>
                </TouchableOpacity>
                <Text style={{ fontWeight: '800', color: text, fontSize: 15, minWidth: 70, textAlign: 'right' }}>{formatCurrency(item.totalPrice)}</Text>
              </View>
            )
          }}
        />

        <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: border, backgroundColor: card, paddingBottom: 32 }}>
          <TouchableOpacity style={{ backgroundColor: brand, paddingVertical: 16, borderRadius: 12, alignItems: 'center' }} onPress={() => setStep('payment')}>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>Select Payment — {formatCurrency(cartTotal)}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <Modal visible={step === 'payment'} animationType="slide" onRequestClose={() => setStep('cart')}>
        <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>
          <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: border, backgroundColor: card }}>
            <TouchableOpacity onPress={() => setStep('cart')}>
              <Text style={{ color: brand, fontWeight: '700', fontSize: 15 }}>← Back to Cart</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: '800', color: text, marginTop: 8 }}>Payment Method</Text>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
            {paymentMethods.map((m) => {
              const active = selectedPayment === m.value
              return (
                <TouchableOpacity
                  key={m.value}
                  onPress={() => { setSelectedPayment(m.value); setMpesaConfirmed(false) }}
                  style={{
                    backgroundColor: active ? brand : card,
                    borderRadius: 12, padding: 16, marginBottom: 10,
                    borderWidth: 2, borderColor: active ? brand : border,
                  }}
                >
                  <Text style={{ fontSize: 16, fontWeight: '700', color: active ? '#fff' : text }}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              )
            })}

            {isMpesa && shopSettings && (
              <View style={{ marginTop: 8 }}>
                <MpesaDetails method={selectedPayment} settings={shopSettings} />
                <TouchableOpacity
                  onPress={() => setMpesaConfirmed(true)}
                  style={{
                    marginTop: 12,
                    backgroundColor: mpesaConfirmed ? '#16a34a' : brand,
                    borderRadius: 12, padding: 14, alignItems: 'center',
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>
                    {mpesaConfirmed ? 'Payment Confirmed' : 'I have received the payment'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: border, backgroundColor: card, paddingBottom: 32 }}>
            <TouchableOpacity
              style={{
                backgroundColor: isProcessing || !canConfirm ? textSecondary : brand,
                paddingVertical: 16, borderRadius: 12, alignItems: 'center',
              }}
              onPress={handleComplete}
              disabled={isProcessing || !canConfirm}
            >
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>
                {isProcessing ? 'Processing…' : canConfirm
                  ? `Complete Sale — ${formatCurrency(cartTotal)}`
                  : 'Confirm payment received first'}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </Modal>
  )
}
