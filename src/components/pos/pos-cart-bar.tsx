// Cart bar — pure UI, no business logic

import { View, Text, TouchableOpacity } from 'react-native'
import type { CartItem } from '../../lib/types'
import { formatCurrency } from '../../lib/utils'

interface Props {
  cart: CartItem[]
  cartTotal: number
  onHold: () => void
  onRecall: () => void
  onClear: () => void
  onCheckout: () => void
  isDark: boolean
  text: string
  textMuted: string
  border: string
  orange: string
}

export function CartBar({ cart, cartTotal, onHold, onRecall, onClear, onCheckout, isDark, text, textMuted, border, orange }: Props) {
  const itemCount = cart.reduce((s, i) => s + i.quantity, 0)

  const btnBase = { paddingHorizontal: 12 as const, paddingVertical: 10 as const, borderRadius: 10 as const }
  const holdBtn = { ...btnBase, backgroundColor: '#f59e0b' }
  const recallBtn = { ...btnBase, backgroundColor: isDark ? '#334155' : '#f1f5f9' }
  const clearBtn = { ...btnBase, backgroundColor: '#ef4444' }
  const checkoutBtn = { ...btnBase, backgroundColor: orange, paddingHorizontal: 16 as const }
  const txtBase = { fontWeight: '700' as const, fontSize: 12 as const }

  return (
    <View style={{ borderTopWidth: 1, borderTopColor: border, backgroundColor: isDark ? '#1e293b' : '#fff', padding: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, color: textMuted }}>{itemCount} items</Text>
          <Text style={{ fontSize: 18, fontWeight: '800', color: text }}>{formatCurrency(cartTotal)}</Text>
        </View>
        <TouchableOpacity style={holdBtn} onPress={onHold}>
          <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Hold</Text>
        </TouchableOpacity>
        <TouchableOpacity style={recallBtn} onPress={onRecall}>
          <Text style={{ color: text, fontSize: 12, fontWeight: '700' }}>Recall</Text>
        </TouchableOpacity>
        <TouchableOpacity style={clearBtn} onPress={onClear}>
          <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Clear</Text>
        </TouchableOpacity>
        <TouchableOpacity style={checkoutBtn} onPress={onCheckout}>
          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>Checkout</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
