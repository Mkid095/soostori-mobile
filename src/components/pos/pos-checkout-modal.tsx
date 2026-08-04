import { useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, Modal, ScrollView, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { CartItem, Sale, Product, ShopSettings } from '../../lib/types'
import { createSale } from '../../services/db-sales'
import { buildReceiptData } from '../../services/db-receipts'
import type { ReceiptData } from '../../services/db-receipts'
import { formatCurrency } from '../../lib/utils'
import { useTheme } from '../../hooks/useTheme'
import { ReceiptView } from './receipt-view'

interface Props {
  visible: boolean
  cart: CartItem[]
  products: Product[]
  shopSettings: ShopSettings | null
  onClose: () => void
  onComplete: () => void
  onUpdateCart: (cart: CartItem[]) => void
}

export function PosCheckoutModal({ visible, cart, products, shopSettings, onClose, onComplete, onUpdateCart }: Props) {
  const { bg, card, text, textSecondary, border, brand } = useTheme()

  const [showPayment, setShowPayment] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<Sale['paymentMethod']>('cash')
  const [isProcessing, setIsProcessing] = useState(false)
  const [completedSale, setCompletedSale] = useState<ReceiptData | null>(null)

  const cartTotal = cart.reduce((s, i) => s + i.totalPrice, 0)

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
    if (cart.length === 0) return
    setIsProcessing(true)
    try {
      await createSale(cart, selectedPayment, cartTotal, 0, cartTotal)
      const receipt = buildReceiptData(cart, shopSettings, selectedPayment)
      setCompletedSale(receipt)
    } catch {
      Alert.alert('Error', 'Failed to complete sale')
    } finally { setIsProcessing(false) }
  }

  function handleReceiptClose() {
    setCompletedSale(null)
    onComplete()
  }

  if (completedSale) {
    return (
      <Modal visible={visible} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>
          <ReceiptView receipt={completedSale} onClose={handleReceiptClose} />
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
          contentContainerStyle={{ padding: 12 }}
          renderItem={({ item }) => (
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: card, borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: border }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', color: text, fontSize: 14 }}>{item.productName}</Text>
                <Text style={{ color: textSecondary, fontSize: 12 }}>{formatCurrency(item.unitPrice)} each</Text>
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
          )}
        />
        <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: border, backgroundColor: card }}>
          <TouchableOpacity style={{ backgroundColor: brand, paddingVertical: 16, borderRadius: 12, alignItems: 'center' }} onPress={() => setShowPayment(true)}>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>Select Payment — {formatCurrency(cartTotal)}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <Modal visible={showPayment} animationType="slide" onRequestClose={() => setShowPayment(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>
          <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: border, backgroundColor: card }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: text }}>Payment Method</Text>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            {(['cash', 'mpesa', 'debt'] as Sale['paymentMethod'][]).map((m) => (
              <TouchableOpacity
                key={m}
                onPress={() => setSelectedPayment(m)}
                style={{ backgroundColor: selectedPayment === m ? brand : card, borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 2, borderColor: selectedPayment === m ? brand : border }}
              >
                <Text style={{ fontSize: 16, fontWeight: '700', color: selectedPayment === m ? '#fff' : text }}>{m === 'mpesa' ? 'M-Pesa' : m.charAt(0).toUpperCase() + m.slice(1)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: border, backgroundColor: card }}>
            <TouchableOpacity style={{ backgroundColor: isProcessing ? textSecondary : brand, paddingVertical: 16, borderRadius: 12, alignItems: 'center' }} onPress={handleComplete} disabled={isProcessing}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>{isProcessing ? 'Processing...' : `Complete Sale — ${formatCurrency(cartTotal)}`}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </Modal>
  )
}
