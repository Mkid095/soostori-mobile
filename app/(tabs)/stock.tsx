// app/(tabs)/stock.tsx — Inventory list with low-stock alerts (manager+)
import { useState, useEffect } from 'react'
import { View, Text, FlatList, TouchableOpacity, TextInput, Alert, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Package, AlertTriangle, X, Plus } from 'lucide-react-native'
import type { Product } from '../../src/lib/types'
import { getAllProducts, adjustStock } from '../../src/services/db-products'
import { getLowStockProducts } from '../../src/services/db-products'
import { formatCurrency } from '../../src/lib/formatters'
import { useTheme } from '../../src/hooks/useTheme'
import { AppHeader } from '../../src/components/shared/app-header'

export default function StockScreen() {
  const { bg, card, text, textSecondary: textMuted, border, brand, danger } = useTheme()
  const [products, setProducts] = useState<Product[]>([])
  const [lowStock, setLowStock] = useState<Product[]>([])
  const [showAdjust, setShowAdjust] = useState<Product | null>(null)
  const [adjustQty, setAdjustQty] = useState('')
  const [adjustReason, setAdjustReason] = useState('')

  useEffect(() => {
    Promise.all([getAllProducts(), getLowStockProducts()]).then(([all, low]) => {
      setProducts(all); setLowStock(low)
    })
  }, [])

  async function handleAdjust() {
    if (!showAdjust || !adjustQty) return
    const qty = parseInt(adjustQty, 10)
    if (isNaN(qty) || qty === 0) { Alert.alert('Error', 'Enter a valid quantity'); return }
    await adjustStock(showAdjust.id, qty, adjustReason || 'Manual adjustment')
    setShowAdjust(null); setAdjustQty(''); setAdjustReason('')
    const [all, low] = await Promise.all([getAllProducts(), getLowStockProducts()])
    setProducts(all); setLowStock(low)
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['bottom']}>
      <AppHeader title="Stock" />

      {/* Low stock alerts */}
      {lowStock.length > 0 && (
        <View style={{ backgroundColor: danger + '15', borderBottomWidth: 1, borderBottomColor: danger, padding: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <AlertTriangle size={16} color={danger} />
            <Text style={{ fontWeight: '700', color: danger, fontSize: 14 }}>Low Stock Alert ({lowStock.length})</Text>
          </View>
          {lowStock.slice(0, 3).map((p) => (
            <Text key={p.id} style={{ color: text, fontSize: 13, marginLeft: 24 }}>• {p.name} — {p.stockQuantity} left</Text>
          ))}
        </View>
      )}

      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
        renderItem={({ item }) => {
          const isLow = lowStock.some((l) => l.id === item.id)
          return (
            <View style={{ backgroundColor: card, borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: isLow ? danger : border }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Package size={18} color={isLow ? danger : brand} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={{ fontWeight: '700', color: text }}>{item.name}</Text>
                  <Text style={{ color: textMuted, fontSize: 12 }}>{formatCurrency(item.sellingPrice)} · {item.stockQuantity} in stock</Text>
                </View>
                <TouchableOpacity
                  style={{ backgroundColor: bg, borderWidth: 1, borderColor: border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}
                  onPress={() => { setShowAdjust(item); setAdjustQty('') }}
                >
                  <Text style={{ color: brand, fontWeight: '700', fontSize: 13 }}>Adjust</Text>
                </TouchableOpacity>
              </View>
            </View>
          )
        }}
        ListEmptyComponent={<View style={{ padding: 40, alignItems: 'center' }}><Text style={{ color: textMuted }}>No products</Text></View>}
      />

      {/* Adjust stock modal */}
      {showAdjust && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
          <View style={{ backgroundColor: card, borderRadius: 16, padding: 20, width: '100%', maxWidth: 320 }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: text, marginBottom: 4 }}>Adjust Stock</Text>
            <Text style={{ color: textMuted, fontSize: 13, marginBottom: 16 }}>{showAdjust.name}</Text>
            <TextInput style={{ backgroundColor: bg, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: text, borderWidth: 1, borderColor: border, marginBottom: 8 }} placeholder="Quantity (+/-)" placeholderTextColor={textMuted} value={adjustQty} onChangeText={setAdjustQty} keyboardType="numeric" />
            <TextInput style={{ backgroundColor: bg, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: text, borderWidth: 1, borderColor: border, marginBottom: 16 }} placeholder="Reason (optional)" placeholderTextColor={textMuted} value={adjustReason} onChangeText={setAdjustReason} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity style={{ flex: 1, backgroundColor: brand, paddingVertical: 12, borderRadius: 8, alignItems: 'center' }} onPress={handleAdjust}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, backgroundColor: bg, borderWidth: 1, borderColor: border }} onPress={() => setShowAdjust(null)}>
                <Text style={{ color: text }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  )
}
