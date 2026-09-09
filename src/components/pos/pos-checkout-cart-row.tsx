// Cart item row for pos-checkout-modal
import { View, Text, TouchableOpacity } from 'react-native'
import type { Product } from '../../lib/types'
import { formatCurrency } from '../../lib/formatters'

interface Props {
  item: { productId: string; productName: string; quantity: number; unitPrice: number; totalPrice: number }
  product: Product | null
  stockOk: boolean
  onAdd: () => void
  onRemove: () => void
  text: string
  textSecondary: string
  border: string
  brand: string
  bg: string
}

export function CartItemRow({ item, product, stockOk, onAdd, onRemove, text, textSecondary, border, brand, bg }: Props) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: bg, borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: stockOk ? border : '#f59e0b' }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: '700', color: text, fontSize: 14 }}>{item.productName}</Text>
        <Text style={{ color: textSecondary, fontSize: 12 }}>{formatCurrency(item.unitPrice)} each</Text>
        {!stockOk && (
          <Text style={{ color: '#f59e0b', fontSize: 11, fontWeight: '600', marginTop: 2 }}>
            Only {product?.stockQuantity ?? 0} in stock
          </Text>
        )}
      </View>
      <TouchableOpacity onPress={onRemove} style={{ backgroundColor: bg, width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: text, fontWeight: '700', fontSize: 18 }}>−</Text>
      </TouchableOpacity>
      <Text style={{ fontWeight: '800', color: text, fontSize: 16, minWidth: 24, textAlign: 'center' }}>{item.quantity}</Text>
      <TouchableOpacity onPress={onAdd} style={{ backgroundColor: brand, width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 18 }}>+</Text>
      </TouchableOpacity>
      <Text style={{ fontWeight: '800', color: text, fontSize: 15, minWidth: 70, textAlign: 'right' }}>{formatCurrency(item.totalPrice)}</Text>
    </View>
  )
}
