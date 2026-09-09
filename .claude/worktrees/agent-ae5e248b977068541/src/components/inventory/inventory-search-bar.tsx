// InventorySearchBar — search input, category chips, add button
// Pure presentation: no business logic.

import { View, Text, TextInput, TouchableOpacity } from 'react-native'
import { Plus } from 'lucide-react-native'
import { CategoryChips } from '../../components/pos/category-chips'
import type { Category } from '../../lib/types'

interface Props {
  searchQuery: string
  categories: Category[]
  selectedCategory: string
  orange: string
  muted: string
  bg: string
  text: string
  border: string
  onSearch: (v: string) => void
  onSelectCategory: (v: string) => void
  onAdd: () => void
}

export function InventorySearchBar({
  searchQuery, categories, selectedCategory, orange, muted, bg, text, border,
  onSearch, onSelectCategory, onAdd,
}: Props) {
  const inputStyle = { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, borderWidth: 1, backgroundColor: bg, color: text, borderColor: border }
  return (
    <View style={{ padding: 12, gap: 8, borderBottomWidth: 1, borderBottomColor: border, backgroundColor: bg }}>
      <TextInput
        style={inputStyle}
        placeholder="Search products, barcode, SKU..."
        placeholderTextColor={muted}
        value={searchQuery}
        onChangeText={onSearch}
      />
      <CategoryChips categories={categories} selected={selectedCategory} onSelect={onSelectCategory} orange={orange} />
      <TouchableOpacity
        style={{ backgroundColor: orange, borderRadius: 10, paddingVertical: 12, alignItems: 'center' }}
        onPress={onAdd}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
    // @ts-expect-error
          <Plus size={18} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Add Product</Text>
        </View>
      </TouchableOpacity>
    </View>
  )
}
