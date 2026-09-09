// LowStockRow — single product row in low-stock list
import { View, Text, TouchableOpacity } from 'react-native'
import { Plus } from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import type { Product } from '../../lib/types'

interface Props {
  product: Product
  onRestock: (product: Product) => void
  orange: string
}

export function LowStockRow({ product, onRestock, orange }: Props) {
  const { card, text, textSecondary: muted, border } = useTheme()
  const deficit = product.lowStockThreshold - product.stockQuantity

  return (
    <View style={{ backgroundColor: card, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: border, flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ width: 10, height: 10, borderRadius: 5, marginRight: 10, backgroundColor: product.categoryColor || '#94A3B8' }} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: text }} numberOfLines={1}>{product.name}</Text>
        <Text style={{ fontSize: 12, color: muted }}>Stock: {product.stockQuantity} / Threshold: {product.lowStockThreshold}</Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        <Text style={{ fontSize: 13, fontWeight: '800', color: '#ef4444' }}>-{deficit}</Text>
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: orange, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 }}
          onPress={() => onRestock(product)}
        >
          <Plus size={14} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>Restock</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
