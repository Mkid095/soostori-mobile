// Step 2: Pricing & Stock
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native'
import { GroupPriceRow } from './group-price-row'

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

function inputStyle(c: Record<string, string>, hasError?: boolean) {
  return {
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, borderWidth: 1,
    backgroundColor: c.card, color: c.text, borderColor: hasError ? c.danger : c.border,
  }
}

function ToggleRow({ label, checked, onToggle, c }: {
  label: string; checked: boolean; onToggle: () => void; c: Record<string, string>
}) {
  return (
    <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }} onPress={onToggle}>
      <View style={{
        width: 22, height: 22, borderRadius: 6,
        backgroundColor: checked ? c.brand : c.card,
        borderWidth: 1, borderColor: checked ? c.brand : c.border,
        justifyContent: 'center', alignItems: 'center',
      }}>
        {checked && <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: '#fff' }} />}
      </View>
      <Text style={{ color: c.text, fontSize: 14 }}>{label}</Text>
    </TouchableOpacity>
  )
}

export function renderPricingStep({
  form, set, c, errors, onAddGroupPrice, onRemoveGroupPrice, onUpdateGroupPrice, isEdit,
}: Props) {
  const isLoose = form.productType !== 'bulk'
  const costPrice = parseFloat(form.costPrice as string) || 0
  const sellingPrice = parseFloat(form.sellingPrice as string) || 0
  const profit = sellingPrice - costPrice
  const profitPct = costPrice > 0 ? (profit / costPrice) * 100 : 0
  const groupPrices = (form.groupPrices as GroupPrice[]) || []

  return (
    <ScrollView style={{ gap: 16 }} showsVerticalScrollIndicator={false}>
      {isLoose && (
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
      )}

      {!isLoose && (
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
          {form.unitsPerPackage && form.boxBuyingPrice && (
            <View style={{ backgroundColor: c.card, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: c.border }}>
              <Text style={{ color: c.textSecondary, fontSize: 12 }}>Cost per Unit</Text>
              <Text style={{ color: c.text, fontSize: 16, fontWeight: '800' }}>
                {(parseFloat(form.boxBuyingPrice as string) / parseInt(form.unitsPerPackage as string)).toFixed(2)}
              </Text>
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
      )}

      <View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: c.text }}>Group Prices</Text>
          <TouchableOpacity onPress={onAddGroupPrice}>
            <Text style={{ color: c.brand, fontWeight: '700', fontSize: 13 }}>+ Add Tier</Text>
          </TouchableOpacity>
        </View>
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
        {groupPrices.length === 0 && (
          <Text style={{ color: c.textSecondary, fontSize: 12, textAlign: 'center', paddingVertical: 8 }}>
            No group prices added
          </Text>
        )}
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
