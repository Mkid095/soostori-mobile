// ProductGridItem — single product tile for POS/sell grid
import { TouchableOpacity, Text, View } from 'react-native'
import { useTheme } from '../../hooks/useTheme'
import { formatCurrency } from '../../lib/formatters'
import type { Product } from '../../lib/types'

interface Props {
  product: Product
  onAddToCart: (product: Product) => void
  orange: string
}

export function ProductGridItem({ product, onAddToCart, orange }: Props) {
  const { card, text, textSecondary: textMuted, border } = useTheme()
  const isOutOfStock = product.trackInventory && product.stockQuantity <= 0

  return (
    <TouchableOpacity
      style={{
        flex: 1, backgroundColor: card, borderRadius: 12, padding: 10, borderWidth: 1,
        borderColor: border, marginBottom: 8, minHeight: 90, justifyContent: 'center',
        opacity: isOutOfStock ? 0.5 : 1,
      }}
      onPress={() => isOutOfStock ? null : onAddToCart(product)}
      activeOpacity={0.7}
    >
      <Text style={{ fontSize: 13, fontWeight: '700', color: text, textAlign: 'center' }} numberOfLines={2}>
        {product.name}
      </Text>
      <Text style={{ fontSize: 12, color: orange, fontWeight: '800', textAlign: 'center', marginTop: 4 }}>
        {formatCurrency(product.sellingPrice)}
      </Text>
      {isOutOfStock ? (
        <Text style={{ fontSize: 10, color: '#ef4444', fontWeight: '700', textAlign: 'center' }}>Out of stock</Text>
      ) : product.trackInventory ? (
        <Text style={{ fontSize: 10, color: textMuted, textAlign: 'center' }}>{product.stockQuantity} left</Text>
      ) : null}
    </TouchableOpacity>
  )
}
