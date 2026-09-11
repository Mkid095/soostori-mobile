// SaleDetailModal — full receipt view for a single sale transaction
// Phase 10: added RefundModal integration
// Phase 16: added Retry Sync button for pending_offline sales

import { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Modal, Alert, StyleSheet } from 'react-native'
import { X, Printer, Share2, RotateCcw, RefreshCw } from 'lucide-react-native'
import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'
import { useTheme } from '../../hooks/useTheme'
import type { Sale, CartItem } from '../../lib/types'
import { buildReceiptData, generateReceiptHTML } from '../../services/db-receipts'
import { getShopSettings } from '../../services/db-settings'
import { SaleMetaCard } from './sale-meta-card'
import { SaleItemsCard } from './sale-items-card'
import { SaleTotalsCard } from './sale-totals-card'
import { RefundModal } from './refund-modal'
import { triggerSync } from '../../services/mobile-sync-service'

interface Props {
  sale: Sale | null
  visible: boolean
  onClose: () => void
}

const RETRY_THRESHOLD_MS = 5 * 60 * 1000 // 5 minutes

export function SaleDetailModal({ sale, visible, onClose }: Props) {
  const { bg, text, border, brand } = useTheme()
  const [printing, setPrinting] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [showRefund, setShowRefund] = useState(false)
  const [retrying, setRetrying] = useState(false)

  if (!sale) return null

  const isPendingOffline = sale.status === 'pending_offline'
  const canRetrySync = isPendingOffline &&
    Date.now() - new Date(sale.createdAt).getTime() > RETRY_THRESHOLD_MS

  async function handleRetrySync() {
    setRetrying(true)
    try {
      await triggerSync()
      Alert.alert('Sync Retried', 'Your sale is being synced. Please check back shortly.')
    } catch {
      Alert.alert('Sync Failed', 'Could not retry sync. Please check your connection.')
    } finally {
      setRetrying(false)
    }
  }

  async function handlePrint() {
    if (!sale) return
    setPrinting(true)
    try {
      const settings = await getShopSettings()
      const cartItems: CartItem[] = (sale.items ?? []).map((i) => ({
        productId: i.productId ?? '',
        productName: i.productName,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        totalPrice: i.totalPrice,
        discount: i.discount,
      }))
      const receipt = buildReceiptData(cartItems, settings, sale.paymentMethod, sale.id)
      await Print.printAsync({ html: generateReceiptHTML(receipt) })
    } catch (e) {
      Alert.alert('Print Error', String(e))
    } finally {
      setPrinting(false)
    }
  }

  async function handleShare() {
    if (!sale) return
    setSharing(true)
    try {
      const settings = await getShopSettings()
      const cartItems: CartItem[] = (sale.items ?? []).map((i) => ({
        productId: i.productId ?? '',
        productName: i.productName,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        totalPrice: i.totalPrice,
        discount: i.discount,
      }))
      const receipt = buildReceiptData(cartItems, settings, sale.paymentMethod, sale.id)
      const { uri } = await Print.printToFileAsync({ html: generateReceiptHTML(receipt) })
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri)
      } else {
        Alert.alert('Sharing not available')
      }
    } catch (e) {
      Alert.alert('Share Error', String(e))
    } finally {
      setSharing(false)
    }
  }

  return (
    <Modal visible={visible} onRequestClose={onClose} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.container, { backgroundColor: bg }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: border }]}>
          <Text style={[styles.title, { color: text }]}>Sale Details</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <X size={20} color={text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.body}>
          <SaleMetaCard sale={sale} />
          <SaleItemsCard items={sale.items ?? []} items_summary={sale.items_summary} />
          <SaleTotalsCard sale={sale} />
        </ScrollView>

        {/* Actions */}
        <View style={[styles.footer, { borderTopColor: border }]}>
          {canRetrySync && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#F59E0B20', borderColor: '#F59E0B' }]}
              onPress={handleRetrySync}
              disabled={retrying}
            >
              <RefreshCw size={16} color="#F59E0B" />
              <Text style={[styles.actionBtnText, { color: '#F59E0B' }]}>
                {retrying ? 'Retrying...' : 'Retry Sync'}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: bg, borderColor: border }]}
            onPress={handleShare}
            disabled={sharing}
          >
            <Share2 size={16} color={text} />
            <Text style={[styles.actionBtnText, { color: text }]}>
              {sharing ? 'Sharing...' : 'Share'}
            </Text>
          </TouchableOpacity>
          {sale.status === 'completed' && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#F59E0B20', borderColor: '#F59E0B' }]}
              onPress={() => setShowRefund(true)}
            >
              <RotateCcw size={16} color="#F59E0B" />
              <Text style={[styles.actionBtnText, { color: '#F59E0B' }]}>Refund</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: brand }]}
            onPress={handlePrint}
            disabled={printing}
          >
            <Printer size={16} color="#fff" />
            <Text style={[styles.actionBtnText, { color: '#fff' }]}>
              {printing ? 'Printing...' : 'Print'}
            </Text>
          </TouchableOpacity>
        </View>

        <RefundModal
          sale={sale}
          visible={showRefund}
          onClose={() => setShowRefund(false)}
          onRefundComplete={(refundId) => {
            setShowRefund(false)
            Alert.alert('Refund Issued', `Refund ${refundId.slice(0, 8)}… completed. Stock has been restored.`)
            onClose()
          }}
        />
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const,
    padding: 16, borderBottomWidth: 1,
  },
  title: { fontSize: 18, fontWeight: '800' as const },
  body: { flex: 1 },
  footer: { flexDirection: 'row' as const, gap: 12, padding: 16, borderTopWidth: 1 },
  actionBtn: {
    flex: 1, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const,
    gap: 6, paddingVertical: 14, borderRadius: 12, borderWidth: 1,
  },
  actionBtnText: { fontSize: 14, fontWeight: '700' as const },
})
