// Pricing card for bulk/package items
import { View, Text, TextInput } from 'react-native'

interface Props {
  form: Record<string, unknown>
  set: (k: string, v: unknown) => void
  c: Record<string, string>
  errors: Record<string, string>
}

function inputStyle(c: Record<string, string>, hasError?: boolean) {
  return {
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, borderWidth: 1,
    backgroundColor: c.card, color: c.text, borderColor: hasError ? c.danger : c.border,
  }
}

export function PricingBulkCard({ form, set, c, errors }: Props) {
  const units = parseInt(form.unitsPerPackage as string) || 0
  const boxPrice = parseFloat(form.boxBuyingPrice as string) || 0
  const costPerUnit = units > 0 && boxPrice > 0 ? (boxPrice / units).toFixed(2) : null

  return (
    <>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: c.text, marginBottom: 6 }}>Units per Box</Text>
          <TextInput
            style={inputStyle(c)} placeholder="e.g. 24" placeholderTextColor={c.textSecondary}
            value={(form.unitsPerPackage as string) || ''} onChangeText={(v) => set('unitsPerPackage', v)}
            keyboardType="number-pad"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: c.text, marginBottom: 6 }}>Box Buying Price</Text>
          <TextInput
            style={inputStyle(c)} placeholder="0.00" placeholderTextColor={c.textSecondary}
            value={(form.boxBuyingPrice as string) || ''} onChangeText={(v) => set('boxBuyingPrice', v)}
            keyboardType="decimal-pad"
          />
        </View>
      </View>
      {costPerUnit !== null && (
        <View style={{ backgroundColor: c.card, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: c.border }}>
          <Text style={{ color: c.textSecondary, fontSize: 12 }}>Cost per Unit</Text>
          <Text style={{ color: c.text, fontSize: 16, fontWeight: '800' }}>{costPerUnit}</Text>
        </View>
      )}
      <View>
        <Text style={{ fontSize: 13, fontWeight: '700', color: c.text, marginBottom: 6 }}>Selling Price per Box</Text>
        <TextInput
          style={inputStyle(c, !!errors.sellingPrice)} placeholder="0.00" placeholderTextColor={c.textSecondary}
          value={(form.sellingPrice as string) || ''} onChangeText={(v) => set('sellingPrice', v)}
          keyboardType="decimal-pad"
        />
      </View>
    </>
  )
}
