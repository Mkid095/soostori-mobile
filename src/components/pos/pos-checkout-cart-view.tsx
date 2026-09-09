// Cart view for pos-checkout
import { View, Text, FlatList, TouchableOpacity } from 'react-native'
import { formatCurrency } from '../../lib/formatters'
import { CartItemRow } from './pos-checkout-cart-row'
import type { CartItem, Product } from '../../lib/types'

interface Props {
  cart: CartItem[]
  products: Product[]
  onAdd: (productId: string) => void
  onRemove: (productId: string) => void
  onSelectPayment: () => void
  cartTotal: number
  onClose: () => void
  bg: string
  card: string
  text: string
  textSecondary: string
  border: string
  brand: string
}

export function CartView({ cart, products, onAdd, onRemove, onSelectPayment, cartTotal, onClose, bg, card, text, textSecondary, border, brand }: Props) {
  return (
    <>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: border, backgroundColor: card }}>
        <Text style={{ fontSize: 18, fontWeight: '800', color: text }}>Cart ({cart.length})</Text>
        <TouchableOpacity onPress={onClose}><Text style={{ color: brand, fontWeight: '700', fontSize: 15 }}>Close</Text></TouchableOpacity>
      </View>
      <FlatList data={cart} keyExtractor={(i) => i.productId} contentContainerStyle={{ padding: 12, paddingBottom: 160 }}
        renderItem={({ item }) => {
          const product = products.find((p) => p.id === item.productId)
          const stockOk = !product?.trackInventory || item.quantity <= (product?.stockQuantity ?? 0)
          return <CartItemRow item={item} product={product ?? null} stockOk={stockOk} onAdd={() => onAdd(item.productId)} onRemove={() => onRemove(item.productId)} text={text} textSecondary={textSecondary} border={border} brand={brand} bg={bg} />
        }}
      />
      <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: border, backgroundColor: card, paddingBottom: 32 }}>
        <TouchableOpacity style={{ backgroundColor: brand, paddingVertical: 16, borderRadius: 12, alignItems: 'center' }} onPress={onSelectPayment}>
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>Select Payment — {formatCurrency(cartTotal)}</Text>
        </TouchableOpacity>
      </View>
    </>
  )
}
