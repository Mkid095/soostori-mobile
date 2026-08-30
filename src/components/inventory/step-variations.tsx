// Step 5 — Variations: add/remove variant rows (name, SKU, barcode, price, stock)
// Pure presentation: no business logic, no API calls.

import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native'
import { Plus, Trash2 } from 'lucide-react-native'

export interface VariantRow {
  id: string
  name: string
  sku: string
  barcode: string
  sellingPrice: string
  costPrice: string
  stockQuantity: string
}

interface Props {
  variants: VariantRow[]
  onAdd: () => void
  onRemove: (index: number) => void
  onUpdate: (index: number, field: keyof VariantRow, value: string) => void
  c: Record<string, string>
}

export function renderVariationsStep({ variants, onAdd, onRemove, onUpdate, c }: Props) {
  const { card, border, text, textSecondary: muted, brand: orange } = c

  return (
    <View style={ss.container}>
      <Text style={[ss.hint, { color: muted }]}>
        Add size, color, or other variations (optional). Skip if product has no variants.
      </Text>

      {variants.map((v, i) => (
        <View key={v.id} style={[ss.card, { backgroundColor: card, borderColor: border }]}>
          <View style={ss.cardHeader}>
            <Text style={[ss.cardTitle, { color: text }]}>Variant {i + 1}</Text>
            <TouchableOpacity onPress={() => onRemove(i)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Trash2 size={16} color="#ef4444" />
            </TouchableOpacity>
          </View>

          <View style={ss.row}>
            <View style={ss.field}>
              <Text style={[ss.label, { color: muted }]}>Name *</Text>
              <TextInput
                style={[ss.input, { backgroundColor: c.bg, borderColor: border, color: text }]}
                placeholder="e.g. Large, Red"
                placeholderTextColor={muted}
                value={v.name}
                onChangeText={(t) => onUpdate(i, 'name', t)}
              />
            </View>
            <View style={ss.field}>
              <Text style={[ss.label, { color: muted }]}>SKU</Text>
              <TextInput
                style={[ss.input, { backgroundColor: c.bg, borderColor: border, color: text }]}
                placeholder="SKU"
                placeholderTextColor={muted}
                value={v.sku}
                onChangeText={(t) => onUpdate(i, 'sku', t)}
              />
            </View>
          </View>

          <View style={ss.row}>
            <View style={ss.field}>
              <Text style={[ss.label, { color: muted }]}>Barcode</Text>
              <TextInput
                style={[ss.input, { backgroundColor: c.bg, borderColor: border, color: text }]}
                placeholder="Barcode"
                placeholderTextColor={muted}
                value={v.barcode}
                onChangeText={(t) => onUpdate(i, 'barcode', t)}
              />
            </View>
            <View style={ss.field}>
              <Text style={[ss.label, { color: muted }]}>Stock Qty</Text>
              <TextInput
                style={[ss.input, { backgroundColor: c.bg, borderColor: border, color: text }]}
                placeholder="0"
                placeholderTextColor={muted}
                keyboardType="numeric"
                value={v.stockQuantity}
                onChangeText={(t) => onUpdate(i, 'stockQuantity', t)}
              />
            </View>
          </View>

          <View style={ss.row}>
            <View style={ss.field}>
              <Text style={[ss.label, { color: muted }]}>Selling Price *</Text>
              <TextInput
                style={[ss.input, { backgroundColor: c.bg, borderColor: border, color: text }]}
                placeholder="0.00"
                placeholderTextColor={muted}
                keyboardType="decimal-pad"
                value={v.sellingPrice}
                onChangeText={(t) => onUpdate(i, 'sellingPrice', t)}
              />
            </View>
            <View style={ss.field}>
              <Text style={[ss.label, { color: muted }]}>Cost Price</Text>
              <TextInput
                style={[ss.input, { backgroundColor: c.bg, borderColor: border, color: text }]}
                placeholder="0.00"
                placeholderTextColor={muted}
                keyboardType="decimal-pad"
                value={v.costPrice}
                onChangeText={(t) => onUpdate(i, 'costPrice', t)}
              />
            </View>
          </View>
        </View>
      ))}

      <TouchableOpacity
        style={[ss.addBtn, { borderColor: orange }]}
        onPress={onAdd}
        activeOpacity={0.7}
      >
        <Plus size={16} color={orange} />
        <Text style={[ss.addBtnText, { color: orange }]}>Add Variation</Text>
      </TouchableOpacity>
    </View>
  )
}

const ss = StyleSheet.create({
  container: { gap: 12 },
  hint: { fontSize: 12, marginBottom: 4 },
  card: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 10 },
  field: { flex: 1, gap: 4 },
  label: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 10, paddingVertical: 12,
  },
  addBtnText: { fontSize: 14, fontWeight: '700' },
})
