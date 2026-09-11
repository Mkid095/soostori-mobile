// RefundModal — full or partial sale refund with reason + stock restoration
// Phase 10
import { useState, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput, Alert, StyleSheet } from 'react-native'
import { X, RotateCcw, Check } from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import type { Sale, SaleItem } from '../../lib/types'
import { formatCurrency } from '../../lib/formatters'
import { refundSale, getRefundItems } from '../../services/db-sale-refund'

interface Props {
  sale: Sale | null
  visible: boolean
  onClose: () => void
  onRefundComplete: (refundId: string) => void
}

export function RefundModal({ sale, visible, onClose, onRefundComplete }: Props) {
  const { bg, card, text, textSecondary: muted, border, brand, success: successColor } = useTheme()
  const [items, setItems] = useState<SaleItem[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [refundType, setRefundType] = useState<'full' | 'partial'>('full')
  const [reason, setReason] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mobile_money' | 'card'>('cash')
  const [loading, setLoading] = useState(false)
  const [loadingItems, setLoadingItems] = useState(false)

  // Load items when modal opens
  useEffect(() => {
    if (visible && sale) {
      setLoadingItems(true)
      getRefundItems(sale.id).then((fetched) => {
        setItems(fetched ?? [])
        setSelectedIds(new Set(fetched?.map((i: SaleItem) => i.id) ?? []))
        setLoadingItems(false)
      }).catch(() => setLoadingItems(false))
    }
  }, [visible, sale])

  const selectedItems = items.filter(i => selectedIds.has(i.id))
  const totalRefund = selectedItems.reduce((s, i) => s + i.totalPrice, 0)

  function toggleItem(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setRefundType('partial')
  }

  function selectAll() {
    setSelectedIds(new Set(items.map(i => i.id)))
    setRefundType('full')
  }

  async function handleRefund() {
    if (!sale) return
    if (!reason.trim()) {
      Alert.alert('Reason Required', 'Please enter a reason for the refund.')
      return
    }
    if (selectedItems.length === 0) {
      Alert.alert('Select Items', 'Please select at least one item to refund.')
      return
    }
    setLoading(true)
    try {
      const lineItems = refundType === 'partial'
        ? selectedItems.map(i => ({ productId: i.productId ?? '', quantity: i.quantity }))
        : undefined
      const result = await refundSale(sale.id, paymentMethod, totalRefund, reason, lineItems)
      onRefundComplete(result.refundId)
      onClose()
    } catch (err) {
      Alert.alert('Refund Failed', err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  if (!sale) return null

  const PAYMENT_OPTIONS: Array<{ value: 'cash' | 'mobile_money' | 'card'; label: string }> = [
    { value: 'cash', label: 'Cash' },
    { value: 'mobile_money', label: 'Mobile Money' },
    { value: 'card', label: 'Card' },
  ]

  return (
    <Modal visible={visible} onRequestClose={onClose} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.container, { backgroundColor: bg }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <RotateCcw size={20} color={brand} />
            <Text style={[styles.title, { color: text }]}>Refund Sale</Text>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <X size={20} color={text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.body} contentContainerStyle={{ padding: 16, gap: 16 }}>
          {/* Sale summary */}
          <View style={[styles.saleCard, { backgroundColor: card, borderColor: border }]}>
            <Text style={[styles.saleCardLabel, { color: muted }]}>Refunding Sale</Text>
            <Text style={[styles.saleCardId, { color: text }]}>{sale.id.slice(0, 12)}…</Text>
            <Text style={[styles.saleCardAmount, { color: brand }]}>{formatCurrency(sale.totalAmount)}</Text>
            <Text style={[styles.saleCardMeta, { color: muted }]}>
              {items.length} item{items.length !== 1 ? 's' : ''} &bull; {sale.paymentMethod}
            </Text>
          </View>

          {/* Refund type */}
          <View style={[styles.section, { borderColor: border }]}>
            <Text style={[styles.sectionTitle, { color: text }]}>Refund Type</Text>
            <View style={styles.typeRow}>
              <TouchableOpacity
                style={[styles.typeBtn, { borderColor: border, backgroundColor: refundType === 'full' ? `${brand}20` : card }]}
                onPress={() => { setRefundType('full'); selectAll() }}
              >
                <Text style={[styles.typeBtnText, { color: refundType === 'full' ? brand : text }]}>Full Refund</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeBtn, { borderColor: border, backgroundColor: refundType === 'partial' ? `${brand}20` : card }]}
                onPress={() => setRefundType('partial')}
              >
                <Text style={[styles.typeBtnText, { color: refundType === 'partial' ? brand : text }]}>Partial Refund</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Items to refund */}
          {refundType === 'partial' && (
            <View style={[styles.section, { borderColor: border }]}>
              <Text style={[styles.sectionTitle, { color: text }]}>Select Items to Refund</Text>
              {items.map(item => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.itemRow, { borderColor: border }]}
                  onPress={() => toggleItem(item.id)}
                >
                  <View style={[
                    styles.checkbox,
                    { borderColor: border, backgroundColor: selectedIds.has(item.id) ? brand : 'transparent' }
                  ]}>
                    {selectedIds.has(item.id) && <Check size={12} color="#fff" />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemName, { color: text }]}>{item.productName}</Text>
                    <Text style={[styles.itemMeta, { color: muted }]}>
                      {item.quantity} × {formatCurrency(item.unitPrice)}
                    </Text>
                  </View>
                  <Text style={[styles.itemTotal, { color: text }]}>{formatCurrency(item.totalPrice)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Reason */}
          <View style={[styles.section, { borderColor: border }]}>
            <Text style={[styles.sectionTitle, { color: text }]}>Reason *</Text>
            <TextInput
              style={[styles.reasonInput, { backgroundColor: card, borderColor: border, color: text }]}
              placeholder="e.g. Defective product, wrong item delivered..."
              placeholderTextColor={muted}
              value={reason}
              onChangeText={setReason}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Refund amount */}
          <View style={[styles.amountBox, { backgroundColor: `${brand}15`, borderColor: brand }]}>
            <Text style={[styles.amountLabel, { color: muted }]}>Total Refund</Text>
            <Text style={[styles.amountValue, { color: brand }]}>{formatCurrency(totalRefund)}</Text>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { borderTopColor: border, backgroundColor: card }]}>
          <TouchableOpacity
            style={[styles.cancelBtn, { borderColor: border }]}
            onPress={onClose}
          >
            <Text style={[styles.cancelBtnText, { color: text }]}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.refundBtn,
              { backgroundColor: loading || !reason.trim() ? muted : brand }
            ]}
            onPress={handleRefund}
            disabled={loading || !reason.trim()}
          >
            <Text style={styles.refundBtnText}>
              {loading ? 'Processing...' : `Issue Refund — ${formatCurrency(totalRefund)}`}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1,
  },
  title: { fontSize: 18, fontWeight: '800' },
  body: { flex: 1 },
  saleCard: { padding: 16, borderRadius: 12, borderWidth: 1 },
  saleCardLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  saleCardId: { fontSize: 12, fontFamily: 'monospace', marginTop: 2 },
  saleCardAmount: { fontSize: 24, fontWeight: '800', marginTop: 4 },
  saleCardMeta: { fontSize: 12, marginTop: 2 },
  section: { borderWidth: 1, borderRadius: 12, padding: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 12 },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, alignItems: 'center',
  },
  typeBtnText: { fontSize: 14, fontWeight: '700' },
  itemRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderBottomWidth: 1,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2, justifyContent: 'center', alignItems: 'center',
  },
  itemName: { fontSize: 14, fontWeight: '600' },
  itemMeta: { fontSize: 12, marginTop: 2 },
  itemTotal: { fontSize: 14, fontWeight: '700' },
  reasonInput: {
    borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14, minHeight: 80, textAlignVertical: 'top',
  },
  amountBox: {
    padding: 16, borderRadius: 12, borderWidth: 1.5, alignItems: 'center',
  },
  amountLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
  amountValue: { fontSize: 28, fontWeight: '800', marginTop: 4 },
  footer: {
    flexDirection: 'row', gap: 12, padding: 16, borderTopWidth: 1,
  },
  cancelBtn: {
    flex: 1, paddingVertical: 16, borderRadius: 12, borderWidth: 1, alignItems: 'center',
  },
  cancelBtnText: { fontSize: 15, fontWeight: '700' },
  refundBtn: {
    flex: 2, paddingVertical: 16, borderRadius: 12, alignItems: 'center',
  },
  refundBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
})
