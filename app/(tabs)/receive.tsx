// app/(tabs)/receive.tsx — Receive stock deliveries (manager+)
import { useState } from 'react'
import { View, Text, FlatList, TextInput, TouchableOpacity, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Package, Search, Plus, Check, Minus } from 'lucide-react-native'
import type { Product } from '../../src/lib/types'
import { searchProducts, adjustStock } from '../../src/services/db-products'
import { formatCurrency } from '../../src/lib/formatters'
import { useTheme } from '../../src/hooks/useTheme'
import { AppHeader } from '../../src/components/shared/app-header'

interface ReceiveItem {
  product: Product
  quantity: number
}

export default function ReceiveScreen() {
  const { bg, card, text, textSecondary: textMuted, border, brand } = useTheme()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [received, setReceived] = useState<ReceiveItem[]>([])

  async function handleSearch(query: string) {
    setSearchQuery(query)
    if (query.length < 2) { setSearchResults([]); return }
    setSearchResults(await searchProducts(query))
  }

  function addItem(product: Product) {
    if (received.some((r) => r.product.id === product.id)) {
      setReceived((prev) => prev.map((r) => r.product.id === product.id ? { ...r, quantity: r.quantity + 1 } : r))
    } else {
      setReceived((prev) => [...prev, { product, quantity: 1 }])
    }
    setSearchResults([])
    setSearchQuery('')
  }

  function updateQty(productId: string, delta: number) {
    setReceived((prev) => prev.map((r) => r.product.id === productId ? { ...r, quantity: Math.max(1, r.quantity + delta) } : r))
  }

  async function handleReceive() {
    if (received.length === 0) return
    for (const item of received) {
      await adjustStock(item.product.id, item.quantity, 'Stock received')
    }
    Alert.alert('Success', 'Stock received and updated')
    setReceived([])
  }

  const totalItems = received.reduce((s, r) => s + r.quantity, 0)

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['bottom']}>
      <AppHeader title="Receive Stock" />

      {/* Search */}
      <View style={{ padding: 12, gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: card, borderRadius: 10, paddingHorizontal: 14, borderWidth: 1, borderColor: border }}>
          <Search size={16} color={textMuted} />
          <TextInput style={{ flex: 1, paddingVertical: 10, fontSize: 15, color: text, marginLeft: 8 }} placeholder="Search product to receive..." placeholderTextColor={textMuted} value={searchQuery} onChangeText={handleSearch} />
        </View>

        {/* Search results */}
        {searchResults.length > 0 && (
          <View style={{ backgroundColor: card, borderRadius: 10, borderWidth: 1, borderColor: border, overflow: 'hidden' }}>
            {searchResults.slice(0, 5).map((p) => (
              <TouchableOpacity key={p.id} style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: border }}
                onPress={() => addItem(p)}>
                <Package size={16} color={brand} />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={{ fontWeight: '600', color: text, fontSize: 14 }}>{p.name}</Text>
                  <Text style={{ color: textMuted, fontSize: 12 }}>{p.stockQuantity} in stock</Text>
                </View>
                <Plus size={16} color={brand} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Received items */}
        {received.map((item) => (
          <View key={item.product.id} style={{ backgroundColor: card, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: border, flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700', color: text }}>{item.product.name}</Text>
              <Text style={{ color: textMuted, fontSize: 12 }}>{formatCurrency(item.product.costPrice)} each</Text>
            </View>
            <TouchableOpacity onPress={() => updateQty(item.product.id, -1)} style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: bg, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: border }}>
              <Minus size={14} color={text} />
            </TouchableOpacity>
            <Text style={{ fontWeight: '800', color: text, fontSize: 16, minWidth: 32, textAlign: 'center' }}>{item.quantity}</Text>
            <TouchableOpacity onPress={() => updateQty(item.product.id, 1)} style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: brand, justifyContent: 'center', alignItems: 'center' }}>
              <Plus size={14} color="#fff" />
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* Receive button */}
      {received.length > 0 && (
        <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: border }}>
          <TouchableOpacity style={{ backgroundColor: brand, paddingVertical: 16, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
            onPress={handleReceive}>
            <Check size={20} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>Receive {totalItems} Item{totalItems !== 1 ? 's' : ''}</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  )
}
