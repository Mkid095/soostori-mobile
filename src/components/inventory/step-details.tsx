// Step 1: Product details (name, SKU, category, unit)
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native'
import { Camera, ChevronDown } from 'lucide-react-native'
import type { Category } from '../../lib/types'
import { UNIT_OPTIONS } from './inventory-types'

interface Props {
  form: Record<string, unknown>
  set: (k: string, v: unknown) => void
  c: Record<string, string>
  categories: Category[]
  onSelectCategory: (cat: Category) => void
  onAddCategory: () => void
  errors: Record<string, string>
  onOpenCategoryPicker: () => void
}

function inputStyle(c: Record<string, string>, hasError?: boolean) {
  return {
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, borderWidth: 1,
    backgroundColor: c.card, color: c.text, borderColor: hasError ? c.danger : c.border,
  }
}

export function renderDetailsStep({
  form, set, c, categories, onSelectCategory, onAddCategory,
  errors, onOpenCategoryPicker,
}: Props) {
  const selectedCat = categories.find((cat) => cat.id === form.categoryId)

  return (
    <ScrollView style={{ gap: 16 }} showsVerticalScrollIndicator={false}>
      {/* Product Name */}
      <View>
        <Text style={{ fontSize: 13, fontWeight: '700', color: c.text, marginBottom: 6 }}>Product Name *</Text>
        <TextInput
          style={inputStyle(c, !!errors.name)}
          placeholder="e.g. Maize Flour 2kg"
          placeholderTextColor={c.textSecondary}
          value={(form.name as string) || ''}
          onChangeText={(v) => set('name', v)}
        />
        {errors.name && <Text style={{ color: c.danger, fontSize: 11, marginTop: 4 }}>{errors.name}</Text>}
      </View>

      {/* SKU */}
      <View>
        <Text style={{ fontSize: 13, fontWeight: '700', color: c.text, marginBottom: 6 }}>SKU</Text>
        <TextInput
          style={inputStyle(c)}
          placeholder="Optional SKU"
          placeholderTextColor={c.textSecondary}
          value={(form.sku as string) || ''}
          onChangeText={(v) => set('sku', v)}
        />
      </View>

      {/* Image placeholder */}
      <TouchableOpacity style={{
        borderRadius: 10, borderWidth: 1, borderColor: c.border, borderStyle: 'dashed',
        paddingVertical: 24, alignItems: 'center', backgroundColor: c.card,
      }}>
        <Camera size={28} color={c.textSecondary} />
        <Text style={{ color: c.textSecondary, fontSize: 13, marginTop: 6 }}>Tap to add image (optional)</Text>
      </TouchableOpacity>

      {/* Category */}
      <View>
        <Text style={{ fontSize: 13, fontWeight: '700', color: c.text, marginBottom: 6 }}>Category</Text>
        <TouchableOpacity
          onPress={onOpenCategoryPicker}
          style={{
            ...inputStyle(c),
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          }}
        >
          {selectedCat ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: selectedCat.color }} />
              <Text style={{ color: c.text, fontWeight: '600' }}>{selectedCat.name}</Text>
            </View>
          ) : (
            <Text style={{ color: c.textSecondary }}>Select category</Text>
          )}
          <ChevronDown size={18} color={c.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Unit */}
      <View>
        <Text style={{ fontSize: 13, fontWeight: '700', color: c.text, marginBottom: 6 }}>Unit</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ gap: 8 }}>
          {UNIT_OPTIONS.map((u) => (
            <TouchableOpacity
              key={u}
              onPress={() => set('unit', u)}
              style={{
                paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12,
                backgroundColor: form.unit === u ? c.brand : c.card,
                borderWidth: 1, borderColor: form.unit === u ? c.brand : c.border,
              }}
            >
              <Text style={{
                color: form.unit === u ? '#fff' : c.text,
                fontWeight: '700', fontSize: 12, textTransform: 'capitalize' as const,
              }}>
                {u}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </ScrollView>
  )
}
