// app/(tabs)/products.tsx — Products tab: list with search, category filter, low-stock badge
import { useState, useCallback, type ListRenderItem } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useFocusEffect } from 'expo-router'
import { Plus, Package, Search, X, AlertTriangle, XCircle } from 'lucide-react-native'
import { useTheme } from '../../src/hooks/useTheme'
import { useProducts, useProductsRefresh } from '../../src/hooks/useProducts'
import { getAllCategories } from '../../src/services/db-categories'
import type { Product, Category } from '../../src/lib/types'

function StockBadge({ qty, threshold }: { qty: number; threshold: number }) {
  if (qty === 0) {
    return (
      <View style={[styles.badge, { backgroundColor: '#ef444420' }]}>
        <XCircle size={10} color="#ef4444" />
        <Text style={{ color: '#ef4444', fontSize: 10, fontWeight: '800', marginLeft: 3 }}>OUT</Text>
      </View>
    )
  }
  if (qty <= threshold) {
    return (
      <View style={[styles.badge, { backgroundColor: '#f59e0b20' }]}>
        <AlertTriangle size={10} color="#f59e0b" />
        <Text style={{ color: '#f59e0b', fontSize: 10, fontWeight: '800', marginLeft: 3 }}>LOW</Text>
      </View>
    )
  }
  return (
    <View style={[styles.badge, { backgroundColor: '#22c55e20' }]}>
      <Package size={10} color="#22c55e" />
      <Text style={{ color: '#22c55e', fontSize: 10, fontWeight: '800', marginLeft: 3 }}>OK</Text>
    </View>
  )
}

function ProductCard({ product, onPress, theme }: { product: Product; onPress: () => void; theme: { card: string; text: string; textSecondary: string; border: string; brand: string; danger: string; warning: string; success: string } }) {
  const { card, text, textSecondary: muted, border, brand: orange, danger, warning, success } = theme

  const barColor = product.stockQuantity === 0 ? danger
    : product.stockQuantity <= product.lowStockThreshold ? warning
    : success
  const barWidth = Math.min(100, (product.stockQuantity / Math.max(product.lowStockThreshold * 3, 1)) * 100)

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: card, borderColor: border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={[styles.productName, { color: text }]} numberOfLines={1}>{product.name}</Text>
          {product.trackInventory && (
            <StockBadge qty={product.stockQuantity} threshold={product.lowStockThreshold} />
          )}
        </View>

        {product.categoryName && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: product.categoryColor || orange }} />
            <Text style={{ fontSize: 11, color: muted, fontWeight: '600' }}>{product.categoryName}</Text>
          </View>
        )}

        <View style={{ flexDirection: 'row', gap: 12, marginTop: 6, alignItems: 'center' }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: orange }}>
            KES {product.sellingPrice}
          </Text>
          {product.sku && (
            <Text style={{ fontSize: 11, color: muted }}>SKU: {product.sku}</Text>
          )}
        </View>

        {product.trackInventory && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
            <View style={{ height: 4, borderRadius: 2, width: 60, backgroundColor: border, overflow: 'hidden' }}>
              <View style={{ height: '100%', width: `${barWidth}%`, backgroundColor: barColor, borderRadius: 2 }} />
            </View>
            <Text style={{ fontSize: 11, color: muted }}>{product.stockQuantity} units</Text>
          </View>
        )}
      </View>

      <View style={{ marginLeft: 10, justifyContent: 'center' }}>
        <Text style={{ fontSize: 16, color: muted }}>→</Text>
      </View>
    </TouchableOpacity>
  )
}

export default function ProductsScreen() {
  const theme = useTheme()
  const { bg, card, text, textSecondary: muted, border, brand: orange } = theme
  const router = useRouter()
  const refreshProducts = useProductsRefresh()

  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [categories, setCategories] = useState<Category[]>([])
  const [refreshing, setRefreshing] = useState(false)

  const { data: allProducts = [], isLoading } = useProducts(search)

  useFocusEffect(
    useCallback(() => {
      getAllCategories().then(setCategories).catch(() => {})
      refreshProducts()
    }, [])
  )

  const filtered = allProducts.filter((p: Product) => {
    if (p.isActive === false) return false
    if (selectedCategory !== 'all' && p.categoryId !== selectedCategory) return false
    return true
  })

  async function onRefresh() {
    setRefreshing(true)
    refreshProducts()
    await getAllCategories().then(setCategories).catch(() => {})
    setRefreshing(false)
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['bottom']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: card, borderBottomWidth: 1, borderBottomColor: border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: text }}>Products</Text>
          <TouchableOpacity
            style={{ backgroundColor: orange, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 }}
            onPress={() => router.push('/products/new' as any)}
          >
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>+ New</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={[styles.searchRow, { backgroundColor: bg, borderColor: border }]}>
          <Search size={16} color={muted} />
          <TextInput
            style={[styles.searchInput, { color: text }]}
            placeholder="Search name, SKU, barcode..."
            placeholderTextColor={muted}
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <X size={16} color={muted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Category chips */}
      <View style={[styles.chipsRow, { borderBottomWidth: 1, borderBottomColor: border }]}>
        <TouchableOpacity
          style={[styles.chip, { backgroundColor: selectedCategory === 'all' ? orange : bg, borderColor: border }]}
          onPress={() => setSelectedCategory('all')}
        >
          <Text style={{ color: selectedCategory === 'all' ? '#fff' : text, fontWeight: '700', fontSize: 12 }}>All</Text>
        </TouchableOpacity>
        {categories.map((cat: Category) => (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.chip,
              {
                backgroundColor: selectedCategory === cat.id ? (cat.color || orange) : bg,
                borderColor: border,
              },
            ]}
            onPress={() => setSelectedCategory(cat.id)}
          >
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: cat.color || orange, marginRight: 4 }} />
            <Text style={{ color: selectedCategory === cat.id ? '#fff' : text, fontWeight: '700', fontSize: 12 }}>
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Count */}
      <View style={{ paddingHorizontal: 12, paddingTop: 8 }}>
        <Text style={{ fontSize: 12, color: muted }}>
          {filtered.length} product{filtered.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(item: Product) => item.id}
        contentContainerStyle={{ padding: 12, paddingBottom: 88 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={orange} />}
        ListEmptyComponent={
          <View style={{ padding: 60, alignItems: 'center' }}>
            <Package size={48} color={muted} />
            <Text style={{ color: muted, fontSize: 15, fontWeight: '600', marginTop: 12 }}>
              {search || selectedCategory !== 'all' ? 'No products match your search' : 'No products yet'}
            </Text>
            {!search && selectedCategory === 'all' && (
              <TouchableOpacity
                style={{ marginTop: 16, backgroundColor: orange, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 }}
                onPress={() => router.push('/products/new' as any)}
              >
                <Text style={{ color: '#fff', fontWeight: '800' }}>+ Add your first product</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        renderItem={({ item }: ListRenderItem<Product>) => (
          <ProductCard
            product={item}
            theme={theme}
            onPress={() => router.push(`/products/${item.id}` as any)}
          />
        )}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  header: { padding: 12 },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 15 },
  chipsRow: {
    flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingVertical: 10, flexWrap: 'wrap',
  },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1,
  },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  card: { borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, flexDirection: 'row', alignItems: 'center' },
  productName: { fontWeight: '700', fontSize: 15, flex: 1 },
})
