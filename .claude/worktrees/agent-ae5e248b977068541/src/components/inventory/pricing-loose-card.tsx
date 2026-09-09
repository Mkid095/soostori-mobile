// Pricing card for loose/individual items
import { View, Text, TextInput } from 'react-native'
import { ToggleRow } from './toggle-row'
import { spacing, radius } from '../../lib/theme'

interface Props {
  form: Record<string, unknown>
  set: (k: string, v: unknown) => void
  c: Record<string, string>
  errors: Record<string, string>
}

function inputStyle(c: Record<string, string>, disabled?: boolean) {
  return {
    borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, borderWidth: 1,
    backgroundColor: disabled ? c.border : c.card,
    color: disabled ? c.textSecondary : c.text,
    borderColor: disabled ? c.border : c.border,
  }
}

export function PricingLooseCard({ form, set, c, errors }: Props) {
  const allowSingle = !!form.allowSingleUnitSale
  const costPrice = parseFloat(form.costPrice as string) || 0
  const sellingPrice = parseFloat(form.sellingPrice as string) || 0
  const profit = sellingPrice - costPrice
  // Gross margin formula: (profit / sellingPrice) * 100
  const profitPct = sellingPrice > 0 ? (profit / sellingPrice) * 100 : 0

  return (
    <View style={{ backgroundColor: c.card, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: c.border, gap: spacing.md }}>
      <Text style={{ fontSize: 13, fontWeight: '700', color: c.text, marginBottom: spacing.xs }}>Unit Prices</Text>

      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: c.text, marginBottom: spacing.xs }}>Cost Price *</Text>
          <TextInput
            style={inputStyle(c, false)}
            placeholder="0.00" placeholderTextColor={c.textSecondary}
            value={(form.costPrice as string) || ''} onChangeText={(v) => set('costPrice', v)}
            keyboardType="decimal-pad"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: c.text, marginBottom: spacing.xs }}>
            Sell Price {!allowSingle && '(Bulk only)'}
          </Text>
          <TextInput
            style={inputStyle(c, !allowSingle)}
            placeholder="0.00" placeholderTextColor={c.textSecondary}
            value={(form.sellingPrice as string) || ''}
            onChangeText={(v) => set('sellingPrice', v)}
            keyboardType="decimal-pad"
            editable={allowSingle}
          />
          {!allowSingle && (
            <Text style={{ fontSize: 11, color: c.textSecondary, marginTop: 4 }}>
              Single unit sale disabled
            </Text>
          )}
        </View>
      </View>

      {allowSingle && costPrice > 0 && sellingPrice > 0 && (
        <View style={{ backgroundColor: c.bg, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: c.border }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ color: c.textSecondary, fontSize: 12 }}>Profit per Unit</Text>
              <Text style={{ color: c.success, fontSize: 16, fontWeight: '700' }}>
                {profit.toFixed(2)}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ color: c.textSecondary, fontSize: 12 }}>Margin</Text>
              <Text style={{ color: profitPct >= 0 ? c.success : c.danger, fontSize: 16, fontWeight: '700' }}>
                {profitPct.toFixed(1)}%
              </Text>
            </View>
          </View>
        </View>
      )}

      <ToggleRow
        label="Allow single unit sale"
        checked={allowSingle}
        onToggle={() => set('allowSingleUnitSale', !allowSingle)}
        c={c}
        hint="When enabled, customers can buy individual units at the single selling price instead of only in package quantities."
      />
    </View>
  )
}
