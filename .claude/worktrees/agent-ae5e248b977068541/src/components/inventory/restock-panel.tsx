import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert,
} from 'react-native'
import { X, Plus } from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import type { Product } from '../../lib/types'
import { adjustStock } from '../../services/db-products'
import { STOCK_REASONS, type StockReason } from './inventory-types'

interface Props {
  product: Product | null
  onClose: () => void
  onDone: () => void
}

export function RestockPanel({ product, onClose, onDone }: Props) {
  const { bg, card, text, textSecondary: muted, border, brand: orange, success } = useTheme()

  const [adjustment, setAdjustment] = useState('')
  const [reason, setReason] = useState<StockReason>('Restock')
  const [saving, setSaving] = useState(false)

  if (!product) return null

  const newStock = product.stockQuantity + (parseInt(adjustment) || 0)

  async function handleSave() {
    const delta = parseInt(adjustment)
    if (isNaN(delta) || delta === 0) {
      Alert.alert('Invalid', 'Enter a stock adjustment value')
      return
    }
    setSaving(true)
    try {
      await adjustStock(product!.id, delta, reason)
      onDone()
      onClose()
    } catch {
      Alert.alert('Error', 'Failed to adjust stock')
    } finally { setSaving(false) }
  }

  return (
    <View style={[s.container, { backgroundColor: card, borderTopWidth: 1, borderTopColor: border }]}>
      <View style={s.header}>
        <Text style={{ fontSize: 15, fontWeight: '800', color: text }}>Restock: {product.name}</Text>
        <TouchableOpacity onPress={onClose} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: bg, justifyContent: 'center', alignItems: 'center' }}>
    // @ts-expect-error
          <X size={18} color={text} />
        </TouchableOpacity>
      </View>

      <View style={s.body}>
        <View style={s.currentStock}>
          <Text style={{ fontSize: 12, color: muted }}>Current Stock</Text>
          <Text style={{ fontSize: 22, fontWeight: '800', color: text }}>{product.stockQuantity}</Text>
        </View>

        <View style={s.arrow}>
          <Text style={{ fontSize: 20, color: muted }}>→</Text>
        </View>

        <View style={s.newStock}>
          <Text style={{ fontSize: 12, color: muted }}>New Stock</Text>
          <Text style={{ fontSize: 22, fontWeight: '800', color: newStock < 0 ? '#ef4444' : success }}>{newStock}</Text>
        </View>
      </View>

      <View style={s.adjustRow}>
        <TouchableOpacity
          style={[s.adjustBtn, { backgroundColor: bg, borderColor: border }]}
          onPress={() => setAdjustment((a) => String(parseInt(a || '0') - 1))}
        >
          <Text style={{ fontSize: 20, fontWeight: '700', color: text }}>−</Text>
        </TouchableOpacity>
        <TextInput
          style={[s.adjustInput, { backgroundColor: bg, color: text, borderColor: border }]}
          placeholder="+/- adjustment"
          placeholderTextColor={muted}
          keyboardType="number-pad"
          value={adjustment}
          onChangeText={setAdjustment}
        />
        <TouchableOpacity
          style={[s.adjustBtn, { backgroundColor: bg, borderColor: border }]}
          onPress={() => setAdjustment((a) => String(parseInt(a || '0') + 1))}
        >
          <Text style={{ fontSize: 20, fontWeight: '700', color: text }}>+</Text>
        </TouchableOpacity>
      </View>

      <View style={s.reasonRow}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: text, marginBottom: 8 }}>Reason</Text>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {STOCK_REASONS.map((r) => (
            <TouchableOpacity
              key={r}
              onPress={() => setReason(r)}
              style={{
                paddingHorizontal: 14, paddingVertical: 7, borderRadius: 12,
                backgroundColor: reason === r ? orange : bg,
                borderWidth: 1, borderColor: reason === r ? orange : border,
              }}
            >
              <Text style={{ color: reason === r ? '#fff' : text, fontWeight: '700', fontSize: 12 }}>{r}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity
        style={{ backgroundColor: saving || !adjustment ? muted : success, borderRadius: 10, paddingVertical: 13, alignItems: 'center' }}
        onPress={handleSave}
        disabled={saving || !adjustment}
      >
        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>
          {saving ? 'Saving...' : `Update Stock (+${adjustment || 0})`}
        </Text>
      </TouchableOpacity>
    </View>
  )
}

const s = StyleSheet.create({
  container: { padding: 16, borderRadius: 16, marginHorizontal: 12, marginBottom: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  body: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginBottom: 14 },
  currentStock: { alignItems: 'center' },
  arrow: { alignItems: 'center' },
  newStock: { alignItems: 'center' },
  adjustRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  adjustBtn: { width: 44, height: 44, borderRadius: 10, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  adjustInput: { flex: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 16, borderWidth: 1, textAlign: 'center' },
  reasonRow: { marginBottom: 14 },
})
