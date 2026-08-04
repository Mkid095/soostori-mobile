// Step 2: Pricing & Stock
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native'
import { GroupPriceRow } from './group-price-row'
import { ToggleRow } from './toggle-row'
import { PricingLooseCard } from './pricing-loose-card'
import { PricingBulkCard } from './pricing-bulk-card'

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
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, borderWidth: 1,
    backgroundColor: c.card, color: c.text, borderColor: c.border,
  }
}

export function renderPricingStep({
  form, set, c, errors, onAddGroupPrice, onRemoveGroupPrice, onUpdateGroupPrice, isEdit,
}: Props) {
  const isLoose = form.productType !== 'bulk'
  const groupPrices = (form.groupPrices as GroupPrice[]) || []

  return (
    <ScrollView style={{ gap: 16 }} showsVerticalScrollIndicator={false}>
      {isLoose ? (
        <PricingLooseCard form={form} set={set} c={c} errors={errors} />
      ) : (
        <PricingBulkCard form={form} set={set} c={c} errors={errors} />
      )}

      <View>
        <Text style={{ fontSize: 13, fontWeight: '700', color: c.text, marginBottom: 8 }}>Group Prices</Text>
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
            borderRadius: 10, paddingVertical: 14,
            alignItems: 'center', borderWidth: 1, borderColor: c.brand,
            borderStyle: 'dashed', marginTop: 4,
          }}
          onPress={onAddGroupPrice}
        >
          <Text style={{ color: c.brand, fontWeight: '700', fontSize: 14 }}>+ Add Tier Price</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: c.text, marginBottom: 6 }}>
            {isEdit ? 'Stock Quantity' : 'Opening Stock'}
          </Text>
          <TextInput
            style={inputStyle(c)} placeholder="0" placeholderTextColor={c.textSecondary}
            value={(form.stockQuantity as string) || ''} onChangeText={(v) => set('stockQuantity', v)}
            keyboardType="number-pad"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: c.text, marginBottom: 6 }}>Low Stock Alert</Text>
          <TextInput
            style={inputStyle(c)} placeholder="10" placeholderTextColor={c.textSecondary}
            value={(form.lowStockThreshold as string) || ''} onChangeText={(v) => set('lowStockThreshold', v)}
            keyboardType="number-pad"
          />
        </View>
      </View>

      <ToggleRow
        label="Track inventory for this product"
        checked={!!form.trackInventory}
        onToggle={() => set('trackInventory', !form.trackInventory)}
        c={c}
      />
    </ScrollView>
  )
}
