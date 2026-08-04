import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  Alert, StyleSheet,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Plus, Package } from 'lucide-react-native'
import { useTheme } from '../../src/hooks/useTheme'
import type { Product, Category } from '../../src/lib/types'
import { getAllProducts, deleteProduct } from '../../src/services/db-products'
import { getAllCategories } from '../../src/services/db-categories'
import { CategoryChips } from '../../src/components/pos/category-chips'
import { InventoryAddForm } from '../../src/components/inventory/inventory-add-form'
import { InventoryEditForm } from '../../src/components/inventory/inventory-edit-form'
import { RestockPanel } from '../../src/components/inventory/restock-panel'
import { ProductRow } from '../../src/components/inventory/product-row'
import { AppHeader } from '../../src/components/shared/app-header'

export default function InventoryScreen() {
  const theme = useTheme()
  const { bg, card, text, textSecondary: muted, border, brand: orange, isDark } = theme
  const inputBg = bg

  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [restocking, setRestocking] = useState<Product | null>(null)

  const loadProducts = useCallback(async () => setProducts(await getAllProducts()), [])
  const loadCategories = useCallback(async () => setCategories(await getAllCategories()), [])

  useEffect(() => { loadProducts(); loadCategories() }, [loadProducts, loadCategories])

  async function handleDelete(product: Product) {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${product.name}"? This will hide it from the inventory.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => { await deleteProduct(product.id); loadProducts() },
        },
      ]
    )
  }

  const filtered = products.filter((p) => {
    const matchCat = selectedCategory === 'all' || p.categoryId === selectedCategory
    const q = searchQuery.toLowerCase()
    const matchSearch = !q
      || p.name.toLowerCase().includes(q)
      || p.barcode?.toLowerCase().includes(q)
      || p.sku?.toLowerCase().includes(q)
    return matchCat && matchSearch
  })

  const inputStyle = {
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 15, borderWidth: 1,
    backgroundColor: inputBg, color: text, borderColor: border,
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['bottom']}>
      <AppHeader title="Inventory" />

      {/* Search & Filter */}
      <View style={{ padding: 12, gap: 8, borderBottomWidth: 1, borderBottomColor: border, backgroundColor: card }}>
        <TextInput
          style={inputStyle}
          placeholder="Search products, barcode, SKU..."
          placeholderTextColor={muted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <CategoryChips
          categories={categories}
          selected={selectedCategory}
          onSelect={setSelectedCategory}
          orange={orange}
        />
        <TouchableOpacity
          style={{ backgroundColor: orange, borderRadius: 10, paddingVertical: 12, alignItems: 'center' }}
          onPress={() => setShowAdd(true)}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Plus size={18} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Add Product</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Restock panel */}
      {restocking && (
        <RestockPanel
          product={restocking}
          onClose={() => setRestocking(null)}
          onDone={() => { loadProducts(); setRestocking(null) }}
        />
      )}

      {/* Product List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 12 }}
        renderItem={({ item }) => (
          <ProductRow
            product={item}
            theme={theme}
            onEdit={() => setEditing(item)}
            onRestock={() => setRestocking(item)}
            onDelete={() => handleDelete(item)}
          />
        )}
        ListEmptyComponent={
          <View style={{ padding: 60, alignItems: 'center' }}>
            <Package size={48} color={muted} />
            <Text style={{ color: muted, fontSize: 15, marginTop: 12, fontWeight: '600' }}>
              {searchQuery || selectedCategory !== 'all' ? 'No products match your search' : 'No products yet'}
            </Text>
            {!searchQuery && selectedCategory === 'all' && (
              <TouchableOpacity
                style={{ marginTop: 16, backgroundColor: orange, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 }}
                onPress={() => setShowAdd(true)}
              >
                <Text style={{ color: '#fff', fontWeight: '800' }}>+ Add your first product</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        ListHeaderComponent={
          filtered.length > 0 ? (
            <Text style={{ color: muted, fontSize: 12, marginBottom: 8 }}>
              {filtered.length} product{filtered.length !== 1 ? 's' : ''}
            </Text>
          ) : null
        }
      />

      {/* Add/Edit Modals */}
      <InventoryAddForm
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        onSaved={() => { loadProducts(); setShowAdd(false) }}
      />

      <InventoryEditForm
        product={editing}
        onClose={() => setEditing(null)}
        onSaved={() => { loadProducts(); setEditing(null) }}
      />
    </SafeAreaView>
  )
}
