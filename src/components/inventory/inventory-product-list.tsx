// InventoryProductList — flat list of products with empty state
// Pure presentation: no business logic.

import { View, Text, FlatList, TouchableOpacity } from 'react-native'
import { Package } from 'lucide-react-native'
import { ProductRow } from './product-row'
import type { Product } from '../../lib/types'

interface ThemeColors { muted: string; orange: string }

interface Props {
  products: Product[]
  theme: { muted: string; brand: string }
  searchQuery: string
  selectedCategory: string
  onEdit: (p: Product) => void
  onRestock: (p: Product) => void
  onDelete: (p: Product) => void
}

export function InventoryProductList({ products, theme, searchQuery, selectedCategory, onEdit, onRestock, onDelete }: Props) {
  const muted = theme.muted
  const orange = theme.brand

  const filtered = products.filter((p) => {
    const matchCat = selectedCategory === 'all' || p.categoryId === selectedCategory
    const q = searchQuery.toLowerCase()
    const matchSearch = !q || p.name.toLowerCase().includes(q) || p.barcode?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q)
    return matchCat && matchSearch
  })

  return (
    <FlatList
      data={filtered}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ padding: 12, paddingBottom: 88 }}
      renderItem={({ item }) => (
        <ProductRow product={item} theme={theme} onEdit={() => onEdit(item)} onRestock={() => onRestock(item)} onDelete={() => onDelete(item)} />
      )}
      ListEmptyComponent={
        <View style={{ padding: 60, alignItems: 'center' }}>
    // @ts-expect-error
          <Package size={48} color={muted} />
          <Text style={{ color: muted, fontSize: 15, marginTop: 12, fontWeight: '600' }}>
            {searchQuery || selectedCategory !== 'all' ? 'No products match your search' : 'No products yet'}
          </Text>
          {!searchQuery && selectedCategory === 'all' && (
            <TouchableOpacity
              style={{ marginTop: 16, backgroundColor: orange, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 }}
              onPress={() => {}}
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
  )
}
