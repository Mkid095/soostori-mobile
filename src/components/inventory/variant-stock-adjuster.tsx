// variant-stock-adjuster.tsx — Inline +/- stock adjustment for a single variant row
// Pure presentation: calls adjustVariantStock service, shows inline feedback.

import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native'
import { Minus, Plus } from 'lucide-react-native'
import { adjustVariantStock } from '../../services/db-product-variants'

interface Props {
  variantId: string
  variantName: string
  currentStock: number
  onAdjusted: (newStock: number) => void
  c: Record<string, string>
}

export function VariantStockAdjuster({ variantId, variantName, currentStock, onAdjusted, c }: Props) {
  const [delta, setDelta] = useState('')
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)

  async function apply(raw: string, sign: 1 | -1) {
    const num = parseInt(raw, 10)
    const qty = isNaN(num) || num <= 0 ? 1 : num
    const quantity = qty * sign

    try {
      await adjustVariantStock(variantId, quantity, `Manual adjustment`)
      const newStock = currentStock + quantity
      onAdjusted(newStock)
      setDelta('')
      setFeedback({ type: 'ok', msg: `Stock ${sign > 0 ? 'added' : 'removed'}` })
    } catch (e) {
      setFeedback({ type: 'err', msg: e instanceof Error ? e.message : 'Adjustment failed' })
    }

    setTimeout(() => setFeedback(null), 2000)
  }

  return (
    <View style={ss.row}>
      <View style={ss.stockDisplay}>
        <Text style={[ss.label, { color: c.textSecondary }]}>Stock</Text>
        <Text style={[ss.stockNum, { color: c.text }]}>{currentStock}</Text>
      </View>

      <View style={ss.controls}>
        <TextInput
          style={[ss.qtyInput, { backgroundColor: c.bg, borderColor: c.border, color: c.text }]}
          placeholder="Qty"
          placeholderTextColor={c.textSecondary}
          keyboardType="number-pad"
          value={delta}
          onChangeText={setDelta}
        />
        <TouchableOpacity
          style={[ss.btn, { backgroundColor: c.success + '22' }]}
          onPress={() => apply(delta, 1)}
          accessibilityLabel={`Add stock to ${variantName}`}
          accessibilityRole="button"
        >
          <Plus size={14} color={c.success} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[ss.btn, { backgroundColor: c.danger + '22' }]}
          onPress={() => apply(delta, -1)}
          accessibilityLabel={`Remove stock from ${variantName}`}
          accessibilityRole="button"
        >
          <Minus size={14} color={c.danger} />
        </TouchableOpacity>
      </View>

      {feedback && (
        <Text style={[ss.fb, { color: feedback.type === 'ok' ? c.success : c.danger }]}>
          {feedback.msg}
        </Text>
      )}
    </View>
  )
}

const ss = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  stockDisplay: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  label: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
  stockNum: { fontSize: 14, fontWeight: '700' },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  qtyInput: {
    borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 4,
    fontSize: 12, width: 52, textAlign: 'center',
  },
  btn: {
    width: 28, height: 28, borderRadius: 6,
    alignItems: 'center', justifyContent: 'center',
  },
  fb: { fontSize: 11, fontWeight: '600', width: '100%', marginTop: 2 },
})
