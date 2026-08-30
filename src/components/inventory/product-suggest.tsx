// ProductSuggest — dropdown showing name/sku/barcode matches while typing a product name
import { View, Text, TouchableOpacity, FlatList } from 'react-native'
import type { Product } from '../../lib/types'
import { formatCurrency } from '../../lib/formatters'

interface Props {
  suggestions: Product[]
  onSelect: (product: Product) => void
  c: Record<string, string>
}

export function ProductSuggest({ suggestions, onSelect, c }: Props) {
  if (suggestions.length === 0) return null
  return (
    <View style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, marginTop: 4 }}>
      <View style={{ backgroundColor: c.card, borderRadius: 10, borderWidth: 1, borderColor: c.border, overflow: 'hidden' }}>
        <FlatList
          data={suggestions.slice(0, 5)}
          keyExtractor={(item) => item.id}
          style={{ maxHeight: 200 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: c.border }}
              onPress={() => onSelect(item)}
            >
              <Text style={{ fontWeight: '700', color: c.text, fontSize: 14 }} numberOfLines={1}>
                {item.name}
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 2 }}>
                {item.sku && <Text style={{ color: c.textSecondary, fontSize: 11 }}>SKU: {item.sku}</Text>}
                {item.barcode && <Text style={{ color: c.textSecondary, fontSize: 11 }}>BC: {item.barcode}</Text>}
                <Text style={{ color: c.brand, fontSize: 11, fontWeight: '700' }}>
                  {formatCurrency(item.sellingPrice)}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      </View>
    </View>
  )
}
