// Receipt History screen — lists completed sales; tap to view/reprint receipt
import { useState, useEffect, useCallback } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Receipt, Printer, RefreshCw } from 'lucide-react-native'
import { useTheme } from '../../src/hooks/useTheme'
import { AppHeader } from '../../src/components/shared/app-header'
import { ReceiptView } from '../../src/components/pos/receipt-view'
import { getReceiptHistory, getSaleById, type ReceiptHistoryItem } from '../../src/services/db-sales'
import { getShopSettings } from '../../src/services/db-settings'
import { buildReceiptData, type ReceiptData } from '../../src/services/db-receipts'

function methodLabel(m: string): string {
  if (m === 'cash') return 'Cash'
  if (m === 'debt') return 'Debt'
  if (m === 'mpesa' || m === 'mobile_money') return 'M-Pesa'
  return m
}

export default function ReceiptsScreen() {
  const { bg, card, text, textSecondary: muted, border, brand } = useTheme()
  const [history, setHistory] = useState<ReceiptHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [receipt, setReceipt] = useState<ReceiptData | null>(null)

  const loadHistory = useCallback(async () => {
    setHistory(await getReceiptHistory(100))
    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => { loadHistory() }, [loadHistory])

  async function openReceipt(item: ReceiptHistoryItem) {
    const sale = await getSaleById(item.id)
    if (!sale) return
    const settings = await getShopSettings()
    const cartItems = (sale.items ?? []).map((i) => ({
      productId: i.productId ?? '',
      productName: i.productName,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      totalPrice: i.totalPrice,
      discount: i.discount,
    }))
    setReceipt(buildReceiptData(cartItems, settings, sale.paymentMethod, item.receiptNumber))
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['bottom']}>
      <AppHeader title="Receipt History" />
      {loading ? (
        <View style={[s.wrap, { backgroundColor: card }]}>
          <ActivityIndicator size="large" color={muted} />
        </View>
      ) : history.length === 0 ? (
        <View style={[s.wrap, { backgroundColor: card, borderColor: border }]}>
          <Receipt size={40} color={muted} />
          <Text style={[s.title, { color: text }]}>No Receipts Yet</Text>
          <Text style={[s.sub, { color: muted }]}>Completed sales will appear here</Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[s.row, { backgroundColor: card, borderColor: border }]}
              onPress={() => openReceipt(item)}
              activeOpacity={0.7}
            >
              <View style={[s.iconWrap, { backgroundColor: brand + '20' }]}>
                <Receipt size={20} color={brand} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.receiptNo, { color: text }]}>{item.receiptNumber}</Text>
                <Text style={[s.meta, { color: muted }]}>{item.itemsSummary} — {methodLabel(item.paymentMethod)}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[s.total, { color: text }]}>KES {item.total.toLocaleString('en-KE', { minimumFractionDigits: 0 })}</Text>
                <Text style={[s.date, { color: muted }]}>{item.date}</Text>
              </View>
              <Printer size={16} color={muted} />
            </TouchableOpacity>
          )}
          contentContainerStyle={{ paddingVertical: 8, paddingBottom: 88 }}
          refreshing={refreshing}
          onRefresh={async () => { setRefreshing(true); await loadHistory() }}
          ListFooterComponent={
            <TouchableOpacity
              style={[s.rfBtn, { borderColor: border }]}
              onPress={async () => { setRefreshing(true); await loadHistory() }}
              disabled={refreshing}
            >
              <RefreshCw size={14} color={muted} />
              <Text style={[s.rfBtnText, { color: muted }]}>Refresh</Text>
            </TouchableOpacity>
          }
        />
      )}
      {receipt && <ReceiptView receipt={receipt} onClose={() => setReceipt(null)} />}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, margin: 12, borderRadius: 12, borderWidth: 1 },
  title: { fontSize: 16, fontWeight: '800' },
  sub: { fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 12, marginVertical: 4, padding: 14, borderRadius: 12, borderWidth: 1 },
  iconWrap: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  receiptNo: { fontSize: 14, fontWeight: '800' },
  meta: { fontSize: 12, marginTop: 2 },
  total: { fontSize: 14, fontWeight: '800' },
  date: { fontSize: 11, marginTop: 2 },
  rfBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginHorizontal: 12, marginTop: 8, paddingVertical: 12, borderRadius: 10, borderWidth: 1 },
  rfBtnText: { fontSize: 13, fontWeight: '600' },
})
