// Step 1: Product details (name, SKU, category, unit)
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native'
import { Camera, Plus } from 'lucide-react-native'
import type { Category } from '../../lib/types'
import { createCategory } from '../../services/db-categories'
import { UNIT_OPTIONS } from './inventory-types'

const baseInput = { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, borderWidth: 1 }

interface Props {
  form: Record<string, any>
  set: (k: string, v: any) => void
  c: any
  categories: Category[]
  showCatInput: boolean
  setShowCatInput: (v: boolean) => void
  newCatName: string
  setNewCatName: (v: string) => void
  onAddCategory: () => void
  onSelectCategory: (cat: Category) => void
  errors: Record<string, string>
}

export function renderDetailsStep({
  form, set, c, categories, showCatInput, setShowCatInput,
  newCatName, setNewCatName, onAddCategory, onSelectCategory, errors,
}: Props) {
  const inputStyle = (hasError?: string) => ({
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 15, borderWidth: 1,
    backgroundColor: c.card, color: c.text, borderColor: hasError ? c.danger : c.border,
  })

  return (
    <ScrollView style={{ gap: 12 }} showsVerticalScrollIndicator={false}>
      <View>
        <Text style={{ fontSize: 13, fontWeight: '700', color: c.text, marginBottom: 6 }}>Product Name *</Text>
        <TextInput
          style={inputStyle(errors.name)}
          placeholder="e.g. Maize Flour 2kg"
          placeholderTextColor={c.textSecondary}
          value={form.name || ''}
          onChangeText={(v) => set('name', v)}
        />
        {errors.name && <Text style={{ color: c.danger, fontSize: 11, marginTop: 4 }}>{errors.name}</Text>}
      </View>

      <View>
        <Text style={{ fontSize: 13, fontWeight: '700', color: c.text, marginBottom: 6 }}>SKU</Text>
        <TextInput
          style={inputStyle()}
          placeholder="Optional SKU"
          placeholderTextColor={c.textSecondary}
          value={form.sku || ''}
          onChangeText={(v) => set('sku', v)}
        />
      </View>

      <TouchableOpacity style={{ borderRadius: 10, borderWidth: 1, borderColor: c.border, borderStyle: 'dashed', paddingVertical: 24, alignItems: 'center', backgroundColor: c.card }}>
        <Camera size={28} color={c.textSecondary} />
        <Text style={{ color: c.textSecondary, fontSize: 13, marginTop: 6 }}>Tap to add image (optional)</Text>
      </TouchableOpacity>

      {/* Category */}
      <View>
        <Text style={{ fontSize: 13, fontWeight: '700', color: c.text, marginBottom: 6 }}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ gap: 8 }}>
          <TouchableOpacity
            style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, backgroundColor: c.card, borderWidth: 1, borderColor: c.border }}
            onPress={() => setShowCatInput(true)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Plus size={14} color={c.brand} />
              <Text style={{ color: c.brand, fontWeight: '700', fontSize: 12 }}>Add</Text>
            </View>
          </TouchableOpacity>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              onPress={() => onSelectCategory(cat)}
              style={{
                paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16,
                backgroundColor: form.categoryId === cat.id ? cat.color : c.card,
                borderWidth: 1, borderColor: form.categoryId === cat.id ? cat.color : c.border,
              }}
            >
              <Text style={{ color: form.categoryId === cat.id ? '#fff' : c.text, fontWeight: '700', fontSize: 12 }}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {showCatInput && (
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <TextInput
              style={{ ...baseInput, flex: 1, backgroundColor: c.card, color: c.text, borderColor: c.border }}
              placeholder="New category name"
              placeholderTextColor={c.textSecondary}
              value={newCatName}
              onChangeText={setNewCatName}
              autoFocus
            />
            <TouchableOpacity style={{ backgroundColor: c.brand, paddingHorizontal: 16, borderRadius: 10, justifyContent: 'center' }} onPress={onAddCategory}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>Add</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ backgroundColor: c.border, paddingHorizontal: 16, borderRadius: 10, justifyContent: 'center' }} onPress={() => setShowCatInput(false)}>
              <Text style={{ color: c.text, fontWeight: '700' }}>X</Text>
            </TouchableOpacity>
          </View>
        )}
        {form.categoryName && <Text style={{ color: c.success, fontSize: 12, marginTop: 6 }}>Selected: {form.categoryName}</Text>}
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
              <Text style={{ color: form.unit === u ? '#fff' : c.text, fontWeight: '700', fontSize: 12, textTransform: 'capitalize' as const }}>
                {u}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </ScrollView>
  )
}
