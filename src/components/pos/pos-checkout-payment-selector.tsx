// Payment method selector for pos-checkout-modal
import { useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator } from 'react-native'
import { formatCurrency } from '../../lib/formatters'
import type { ShopSettings } from '../../lib/types'
import { MpesaDetails } from './pos-checkout-mpesa-details'
import type { PaymentMethod } from './usePaymentMethods'

type MpesaStatus = 'idle' | 'input' | 'requesting' | 'polling' | 'success' | 'error'

interface Props {
  paymentMethods: { value: PaymentMethod; label: string }[]
  selectedPayment: PaymentMethod
  onSelectPayment: (p: PaymentMethod) => void
  isMpesa: boolean
  shopSettings: ShopSettings | null
  mpesaStatus: MpesaStatus
  mpesaPhone: string
  mpesaError: string
  onMpesaRequest: (phone: string) => void
  cartTotal: number
  isProcessing: boolean
  canConfirm: boolean
  onBack: () => void
  onComplete: () => void
  bg: string
  card: string
  text: string
  textSecondary: string
  border: string
  brand: string
}

export function PaymentMethodSelector({
  paymentMethods, selectedPayment, onSelectPayment,
  isMpesa, shopSettings,
  mpesaStatus, mpesaPhone, mpesaError, onMpesaRequest,
  cartTotal, isProcessing, canConfirm, onBack, onComplete,
  bg, card, text, textSecondary, border, brand,
}: Props) {
  const [phoneInput, setPhoneInput] = useState(mpesaPhone)
  return (
    <>
      <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: border, backgroundColor: card }}>
        <TouchableOpacity onPress={onBack}>
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
              onPress={() => onSelectPayment(m.value)}
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

            {mpesaStatus === 'idle' && (
              <>
                <Text style={{ fontSize: 12, color: textSecondary, marginBottom: 6, marginTop: 4 }}>
                  Enter customer phone number to send STK push
                </Text>
                <TextInput
                  value={phoneInput}
                  onChangeText={setPhoneInput}
                  placeholder="07xxxxxxxx"
                  keyboardType="phone-pad"
                  style={{
                    backgroundColor: card, borderWidth: 1, borderColor: border,
                    borderRadius: 10, padding: 12, fontSize: 16, color: text,
                  }}
                />
                <TouchableOpacity
                  onPress={() => phoneInput.trim().length >= 9 && onMpesaRequest(phoneInput.trim())}
                  style={{
                    marginTop: 10,
                    backgroundColor: phoneInput.trim().length < 9 ? textSecondary : brand,
                    borderRadius: 12, padding: 14, alignItems: 'center',
                  }}
                  disabled={phoneInput.trim().length < 9}
                >
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>
                    Send M-Pesa Request
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {mpesaStatus === 'requesting' && (
              <View style={{ marginTop: 12, alignItems: 'center', padding: 20 }}>
                <ActivityIndicator size="large" color={brand} />
                <Text style={{ color: text, fontWeight: '700', marginTop: 10 }}>Sending payment request…</Text>
              </View>
            )}

            {mpesaStatus === 'polling' && (
              <View style={{ marginTop: 12, alignItems: 'center', padding: 20 }}>
                <ActivityIndicator size="large" color={brand} />
                <Text style={{ color: text, fontWeight: '700', marginTop: 10 }}>Waiting for payment…</Text>
                <Text style={{ color: textSecondary, fontSize: 13, marginTop: 4 }}>
                  Check your phone and enter M-Pesa PIN
                </Text>
                <TouchableOpacity
                  onPress={() => onMpesaRequest(phoneInput)}
                  style={{ marginTop: 12, padding: 10 }}
                >
                  <Text style={{ color: textSecondary, fontSize: 13, textDecorationLine: 'underline' }}>
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {mpesaStatus === 'success' && (
              <View style={{ marginTop: 12, backgroundColor: '#16a34a', borderRadius: 12, padding: 14, alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Payment Received</Text>
              </View>
            )}

            {mpesaStatus === 'error' && (
              <View style={{ marginTop: 12 }}>
                <View style={{ backgroundColor: '#fef2f2', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#fecaca' }}>
                  <Text style={{ color: '#dc2626', fontSize: 14, fontWeight: '600' }}>{mpesaError}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => onMpesaRequest(phoneInput)}
                  style={{ marginTop: 10, backgroundColor: brand, borderRadius: 12, padding: 14, alignItems: 'center' }}
                >
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Try Again</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: border, backgroundColor: card, paddingBottom: 32 }}>
        <TouchableOpacity
          style={{
            backgroundColor: isProcessing || !canConfirm ? textSecondary : brand,
            paddingVertical: 16, borderRadius: 12, alignItems: 'center',
          }}
          onPress={onComplete}
          disabled={isProcessing || !canConfirm}
        >
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>
            {isProcessing ? 'Processing…' : canConfirm
              ? `Complete Sale — ${formatCurrency(cartTotal)}`
              : mpesaStatus === 'polling' || mpesaStatus === 'requesting'
              ? 'Waiting for M-Pesa…'
              : 'Confirm payment received first'}
          </Text>
        </TouchableOpacity>
      </View>
    </>
  )
}
