// DebtDetailModal — full view of a debt with payment history
// Pure presentation: no business logic, no API calls.

import { View, Text, TouchableOpacity, Modal, ScrollView } from 'react-native'
import { useTheme } from '../../hooks/useTheme'
import type { Debt } from '../../lib/types'
import { formatCurrency, formatDate, formatTime } from '../../lib/utils'

interface Props {
  debt: Debt | null
  onClose: () => void
  onRecordPayment: (debt: Debt) => void
}

const STATUS_COLORS = {
  pending: '#F59E0B',
  partial: '#3B82F6',
  paid: '#10B981',
}

export function DebtDetailModal({ debt, onClose, onRecordPayment }: Props) {
  const { card, text, textSecondary: textMuted, border, success, brand: orange, isDark } = useTheme()

  if (!debt) return null

  const balance = debt.amount - debt.amountPaid
  const statusColor = STATUS_COLORS[debt.status] || STATUS_COLORS.pending
  const paidPercent = debt.amount > 0 ? (debt.amountPaid / debt.amount) * 100 : 0

  return (
    <Modal visible={!!debt} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View
          style={{
            backgroundColor: card,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            maxHeight: '85%',
          }}
        >
          {/* Drag handle */}
          <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: border }} />
          </View>

          {/* Header */}
          <View style={{ paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: border }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 20, fontWeight: '800', color: text }}>{debt.customerName || 'Unknown Customer'}</Text>
                {debt.customerPhone && (
                  <Text style={{ fontSize: 13, color: textMuted, marginTop: 2 }}>{debt.customerPhone}</Text>
                )}
                <Text style={{ fontSize: 11, color: textMuted, marginTop: 4 }}>
                  Created {formatDate(debt.createdAt)}
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: statusColor + '20',
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 8,
                }}
              >
                <Text style={{ color: statusColor, fontWeight: '800', fontSize: 12, textTransform: 'uppercase' }}>
                  {debt.status}
                </Text>
              </View>
            </View>

            {/* Amount summary */}
            <View style={{ flexDirection: 'row', gap: 16, marginTop: 16 }}>
              <View style={{ flex: 1, backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderRadius: 10, padding: 12, alignItems: 'center' }}>
                <Text style={{ fontSize: 11, color: textMuted, fontWeight: '600' }}>TOTAL</Text>
                <Text style={{ fontSize: 18, fontWeight: '800', color: text, marginTop: 2 }}>
                  {formatCurrency(debt.amount)}
                </Text>
              </View>
              <View style={{ flex: 1, backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderRadius: 10, padding: 12, alignItems: 'center' }}>
                <Text style={{ fontSize: 11, color: textMuted, fontWeight: '600' }}>PAID</Text>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#10B981', marginTop: 2 }}>
                  {formatCurrency(debt.amountPaid)}
                </Text>
              </View>
              <View style={{ flex: 1, backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderRadius: 10, padding: 12, alignItems: 'center' }}>
                <Text style={{ fontSize: 11, color: textMuted, fontWeight: '600' }}>BALANCE</Text>
                <Text style={{ fontSize: 18, fontWeight: '800', color: balance > 0 ? '#EF4444' : '#10B981', marginTop: 2 }}>
                  {formatCurrency(balance)}
                </Text>
              </View>
            </View>

            {/* Progress bar */}
            <View style={{ marginTop: 12 }}>
              <View
                style={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: isDark ? '#0F172A' : '#E2E8F0',
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    height: '100%',
                    width: `${paidPercent}%`,
                    backgroundColor: statusColor,
                    borderRadius: 4,
                  }}
                />
              </View>
              <Text style={{ fontSize: 11, color: textMuted, marginTop: 4, textAlign: 'right' }}>
                {paidPercent.toFixed(0)}% paid
              </Text>
            </View>
          </View>

          {/* Payment history */}
          <ScrollView style={{ paddingHorizontal: 20, paddingTop: 16 }} contentContainerStyle={{ paddingBottom: 24 }}>
            <Text style={{ fontSize: 14, fontWeight: '800', color: text, marginBottom: 12 }}>Payment History</Text>

            {(!debt.payments || debt.payments.length === 0) ? (
              <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                <Text style={{ color: textMuted, fontSize: 13 }}>No payments recorded yet</Text>
              </View>
            ) : (
              <View style={{ gap: 8 }}>
                {debt.payments.map((payment) => (
                  <View
                    key={payment.id}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                      borderRadius: 10,
                      padding: 12,
                      borderWidth: 1,
                      borderColor: border,
                    }}
                  >
                    <View>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: text }}>
                        {formatCurrency(payment.amount)}
                      </Text>
                      <Text style={{ fontSize: 11, color: textMuted, marginTop: 2 }}>
                        {payment.paymentMethod === 'mpesa' ? 'M-Pesa' : 'Cash'}
                        {payment.reference ? ` • ${payment.reference}` : ''}
                      </Text>
                      <Text style={{ fontSize: 10, color: textMuted, marginTop: 2 }}>
                        {formatDate(payment.createdAt)} at {formatTime(payment.createdAt)}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#10B981' }}>
                      +{formatCurrency(payment.amount)}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {debt.notes && (
              <View style={{ marginTop: 16 }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: text, marginBottom: 8 }}>Notes</Text>
                <Text style={{ fontSize: 13, color: textMuted }}>{debt.notes}</Text>
              </View>
            )}
          </ScrollView>

          {/* Action footer */}
          {debt.status !== 'paid' && (
            <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: border }}>
              <TouchableOpacity
                style={{
                  backgroundColor: success,
                  borderRadius: 12,
                  paddingVertical: 14,
                  alignItems: 'center',
                }}
                onPress={() => {
                  onClose()
                  setTimeout(() => onRecordPayment(debt), 300)
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Record Payment</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  )
}
