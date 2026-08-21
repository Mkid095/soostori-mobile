// Step 2: Pricing & Stock
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native'
import { GroupPriceRow } from './group-price-row'
import { ToggleRow } from './toggle-row'
import { PricingLooseCard } from './pricing-loose-card'
import { PricingBulkCard } from './pricing-bulk-card'
import { spacing, radius } from '../../lib/theme'

interface GroupPrice {
  name: string; price: string; minQuantity: string
}

interface Props {
  form: Record<string, unknown>
  set: (k: string, v: unknown) => void
  c: Record<string, string>
  errors: Record<string, string>
  onAddGroupPrice: () => void
  onRemoveGroupPrice: (i: number) => void
  onUpdateGroupPrice: (i: number, f: keyof GroupPrice, v: string) => void
  isEdit: boolean
}

function inputStyle(c: Record<string, string>) {
  return {
    borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, borderWidth: 1,
    backgroundColor: c.card, color: c.text, borderColor: c.border,
  }
}

export function renderPricingStep({
  form, set, c, errors, onAddGroupPrice, onRemoveGroupPrice, onUpdateGroupPrice, isEdit,
}: Props) {
  const isLoose = form.productType !== 'bulk'
  const trackInventory = !!form.trackInventory
  const groupPrices = (form.groupPrices as GroupPrice[]) || []

  return (
    <ScrollView style={{ gap: spacing.lg }} showsVerticalScrollIndicator={false}>
      {/* Pricing Card */}
      {isLoose ? (
        <PricingLooseCard form={form} set={set} c={c} errors={errors} />
      ) : (
        <PricingBulkCard form={form} set={set} c={c} errors={errors} />
      )}

      {/* Group Prices Card */}
      <View style={{ backgroundColor: c.card, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: c.border, gap: spacing.md }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: c.text, marginBottom: spacing.xs }}>Group Prices</Text>
        {groupPrices.map((gp, i) => (
          <GroupPriceRow
            key={i}
            gp={gp}
            index={i}
            c={c}
            onUpdate={onUpdateGroupPrice}
            onRemove={onRemoveGroupPrice}
          />
        ))}
        <TouchableOpacity
          style={{
            borderRadius: radius.md, paddingVertical: 14,
            alignItems: 'center', borderWidth: 1, borderColor: c.brand,
            borderStyle: 'dashed',
          }}
          onPress={onAddGroupPrice}
        >
          <Text style={{ color: c.brand, fontWeight: '700', fontSize: 14 }}>+ Add Tier Price</Text>
        </TouchableOpacity>
      </View>

      {/* Stock Settings Card */}
      <View style={{ backgroundColor: c.card, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: c.border, gap: spacing.md }}>
        <ToggleRow
          label="Track inventory for this product"
          checked={trackInventory}
          onToggle={() => set('trackInventory', !trackInventory)}
          c={c}
          hint="When enabled, the app will monitor stock levels and alert you when inventory falls below the low stock threshold."
        />

        {trackInventory && (
          <View style={{ gap: spacing.md }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: c.text }}>Stock Levels</Text>
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: c.text, marginBottom: spacing.xs }}>
                  {isEdit ? 'Current Stock' : 'Opening Stock'}
                </Text>
                <TextInput
                  style={inputStyle(c)} placeholder="0" placeholderTextColor={c.textSecondary}
                  value={(form.stockQuantity as string) || ''} onChangeText={(v) => set('stockQuantity', v)}
                  keyboardType="number-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: c.text, marginBottom: spacing.xs }}>Low Stock Alert</Text>
                <TextInput
                  style={inputStyle(c)} placeholder="10" placeholderTextColor={c.textSecondary}
                  value={(form.lowStockThreshold as string) || ''} onChangeText={(v) => set('lowStockThreshold', v)}
                  keyboardType="number-pad"
                />
              </View>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  )
}
