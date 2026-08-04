// Pricing card for loose/individual items
import { View, Text, TextInput } from 'react-native'
import { ToggleRow } from './toggle-row'

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

export function PricingLooseCard({ form, set, c, errors }: Props) {
  const costPrice = parseFloat(form.costPrice as string) || 0
  const sellingPrice = parseFloat(form.sellingPrice as string) || 0
  const profit = sellingPrice - costPrice
  const profitPct = costPrice > 0 ? (profit / costPrice) * 100 : 0

  return (
    <>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: c.text, marginBottom: 6 }}>Buying Price *</Text>
          <TextInput
            style={inputStyle(c, !!errors.costPrice)}
            placeholder="0.00" placeholderTextColor={c.textSecondary}
            value={(form.costPrice as string) || ''} onChangeText={(v) => set('costPrice', v)}
            keyboardType="decimal-pad"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: c.text, marginBottom: 6 }}>Selling Price *</Text>
          <TextInput
            style={inputStyle(c, !!errors.sellingPrice)}
            placeholder="0.00" placeholderTextColor={c.textSecondary}
            value={(form.sellingPrice as string) || ''} onChangeText={(v) => set('sellingPrice', v)}
            keyboardType="decimal-pad"
          />
        </View>
      </View>
      {costPrice > 0 && sellingPrice > 0 && (
        <View style={{ backgroundColor: c.card, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: c.border }}>
          <Text style={{ color: c.textSecondary, fontSize: 12 }}>Profit Margin</Text>
          <Text style={{ color: c.success, fontSize: 16, fontWeight: '800' }}>
            {profit.toFixed(2)} ({profitPct.toFixed(0)}%)
          </Text>
        </View>
      )}
      <ToggleRow
        label="Allow single unit sale"
        checked={!!form.allowSingleUnitSale}
        onToggle={() => set('allowSingleUnitSale', !form.allowSingleUnitSale)}
        c={c}
      />
    </>
  )
}
