// app/(tabs)/low-stock.tsx — Dedicated low-stock view with quick restock
import { useState, useCallback } from 'react'
import { View, Text, TouchableOpacity, FlatList, RefreshControl, StyleSheet, Alert, TextInput } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { AlertTriangle, Package, Plus, RefreshCw, X } from 'lucide-react-native'
import { useTheme } from '../../src/hooks/useTheme'
import type { Product } from '../../src/lib/types'
import { getLowStockProducts, adjustStock } from '../../src/services/db-products'

export default function LowStockScreen() {
  const theme = useTheme()
  const { bg, card, text, textSecondary: muted, border, brand: orange, success, danger } = theme
  const router = useRouter()

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [restockingProduct, setRestockingProduct] = useState<Product | null>(null)
  const [restockQty, setRestockQty] = useState('')

  const load = useCallback(async () => {
    setProducts(await getLowStockProducts())
    setLoading(false)
  }, [])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

  const handleRestock = async () => {
    if (!restockingProduct) return
    const qty = parseInt(restockQty)
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Invalid', 'Enter a valid quantity')
      return
    }
    await adjustStock(restockingProduct.id, qty, 'Restock')
    setRestockingProduct(null)
    setRestockQty('')
    await load()
  }

  const totalToRestock = products.reduce((sum, p) => sum + (p.lowStockThreshold - p.stockQuantity), 0)

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['bottom']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: card, borderBottomWidth: 1, borderBottomColor: border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <X size={22} color={text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <AlertTriangle size={20} color={danger} />
          <Text style={{ fontSize: 17, fontWeight: '800', color: text, marginLeft: 6 }}>Low Stock</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Summary */}
      <View style={[styles.summary, { backgroundColor: card, borderBottomWidth: 1, borderBottomColor: border }]}>
        <View style={styles.summaryItem}>
          <Text style={{ fontSize: 26, fontWeight: '800', color: danger }}>{products.length}</Text>
          <Text style={{ fontSize: 12, color: muted }}>Products Low</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: border }]} />
        <View style={styles.summaryItem}>
          <Text style={{ fontSize: 26, fontWeight: '800', color: orange }}>{totalToRestock}</Text>
          <Text style={{ fontSize: 12, color: muted }}>Units to Restock</Text>
        </View>
      </View>

      {/* List */}
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={orange} />}
        contentContainerStyle={{ padding: 12, gap: 10 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Package size={48} color={muted} />
            <Text style={{ fontSize: 15, fontWeight: '700', color: text, marginTop: 12 }}>All Stocked Up</Text>
            <Text style={{ fontSize: 13, color: muted, textAlign: 'center', marginTop: 4 }}>
              No products are below their low-stock threshold
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const deficit = item.lowStockThreshold - item.stockQuantity
          return (
            <View style={[styles.row, { backgroundColor: card, borderColor: border }]}>
              <View style={[styles.colorDot, { backgroundColor: item.categoryColor || '#94A3B8' }]} />
              <View style={styles.rowInfo}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: text }} numberOfLines={1}>{item.name}</Text>
                <Text style={{ fontSize: 12, color: muted }}>
                  Stock: {item.stockQuantity} / Threshold: {item.lowStockThreshold}
                </Text>
              </View>
              <View style={styles.rowRight}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: danger }}>-{deficit}</Text>
                <TouchableOpacity
                  style={[styles.restockBtn, { backgroundColor: orange }]}
                  onPress={() => { setRestockingProduct(item); setRestockQty(String(deficit)) }}
                >
                  <Plus size={14} color="#fff" />
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>Restock</Text>
                </TouchableOpacity>
              </View>
            </View>
          )
        }}
      />

      {/* Restock Modal */}
      {restockingProduct && (
        <View style={[styles.modalOverlay]}>
          <View style={[styles.modal, { backgroundColor: card, borderWidth: 1, borderColor: border }]}>
            <View style={styles.modalHeader}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: text }}>Restock</Text>
              <TouchableOpacity onPress={() => setRestockingProduct(null)}>
                <X size={20} color={muted} />
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 14, color: muted, marginBottom: 12 }}>{restockingProduct.name}</Text>
            <View style={styles.modalStock}>
              <View style={styles.stockBox}>
                <Text style={{ fontSize: 11, color: muted }}>Current</Text>
                <Text style={{ fontSize: 20, fontWeight: '800', color: text }}>{restockingProduct.stockQuantity}</Text>
              </View>
              <Text style={{ fontSize: 20, color: muted }}>→</Text>
              <View style={styles.stockBox}>
                <Text style={{ fontSize: 11, color: muted }}>After</Text>
                <Text style={{ fontSize: 20, fontWeight: '800', color: success }}>
                  {restockingProduct.stockQuantity + (parseInt(restockQty) || 0)}
                </Text>
              </View>
            </View>
            <TextInput
              style={[styles.modalInput, { backgroundColor: bg, borderColor: border, color: text }]}
              keyboardType="number-pad"
              placeholder="+ quantity"
              placeholderTextColor={muted}
              value={restockQty}
              onChangeText={setRestockQty}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={[styles.qtyBtn, { backgroundColor: bg, borderColor: border }]}
                onPress={() => setRestockQty((q) => String(Math.max(1, parseInt(q || '1') - 1)))}
              >
                <Text style={{ fontSize: 18, fontWeight: '700', color: text }}>−</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.qtyBtn, { backgroundColor: bg, borderColor: border }]}
                onPress={() => setRestockQty((q) => String(parseInt(q || '0') + 1))}
              >
                <Text style={{ fontSize: 18, fontWeight: '700', color: text }}>+</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: success }]}
              onPress={handleRestock}
            >
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flexDirection: 'row', alignItems: 'center' },
  summary: { flexDirection: 'row', paddingVertical: 16, paddingHorizontal: 24 },
  summaryItem: { flex: 1, alignItems: 'center' },
  divider: { width: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  row: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 12, borderWidth: 1 },
  colorDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  rowInfo: { flex: 1 },
  rowRight: { alignItems: 'flex-end', gap: 6 },
  restockBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  modalOverlay: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modal: { width: '100%', borderRadius: 16, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  modalStock: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginBottom: 16 },
  stockBox: { alignItems: 'center' },
  modalInput: { borderRadius: 10, paddingVertical: 12, marginBottom: 10, borderWidth: 1 },
  qtyBtn: { flex: 1, height: 44, borderRadius: 10, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  saveBtn: { borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginTop: 10 },
})
