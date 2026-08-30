// Step 1: Product details (name, SKU, category, unit, image)
import { useState, useRef, useCallback } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native'
import { Camera, ChevronDown, Plus, Image } from 'lucide-react-native'
import * as ImagePicker from 'expo-image-picker'
import type { Category, Product } from '../../lib/types'
import { searchProducts } from '../../services/db-products'
import { ProductSuggest } from './product-suggest'

interface Props {
  form: Record<string, unknown>
  set: (k: string, v: unknown) => void
  c: Record<string, string>
  categories: Category[]
  onSelectCategory: (cat: Category) => void
  onAddCategory: () => void
  errors: Record<string, string>
  onOpenCategoryPicker: () => void
  onOpenUnitPicker: () => void
  onSelectSuggestion?: (product: Product) => void
}

function inputStyle(c: Record<string, string>, hasError?: boolean) {
  return {
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, borderWidth: 1,
    backgroundColor: c.card, color: c.text, borderColor: hasError ? c.danger : c.border,
  }
}

export function renderDetailsStep({
  form, set, c, categories, onAddCategory,
  errors, onOpenCategoryPicker, onOpenUnitPicker, onSelectSuggestion,
}: Props) {
  const [suggestions, setSuggestions] = useState<Product[]>([])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const selectedCat = categories.find((cat) => cat.id === form.categoryId)

  const handleNameChange = useCallback((v: string) => {
    set('name', v)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (v.trim().length < 2) { setSuggestions([]); return }
    debounceRef.current = setTimeout(async () => {
      const results = await searchProducts(v.trim())
      setSuggestions(results)
    }, 300)
  }, [set])

  function handleSelectSuggestion(product: Product) {
    setSuggestions([])
    if (onSelectSuggestion) onSelectSuggestion(product)
  }

  async function pickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photo library.')
      return
    }
    Alert.alert('Add Image', 'Choose an option', [
      {
        text: 'Take Photo',
        onPress: async () => {
          const cam = await ImagePicker.requestCameraPermissionsAsync()
          if (!cam.granted) {
            Alert.alert('Permission Required', 'Please allow camera access.')
            return
          }
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
          })
          if (!result.canceled && result.assets[0]) {
            set('imageUrl', result.assets[0].uri)
          }
        },
      },
      {
        text: 'Choose from Gallery',
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
          })
          if (!result.canceled && result.assets[0]) {
            set('imageUrl', result.assets[0].uri)
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ])
  }

  return (
    <ScrollView style={{ gap: 16, paddingVertical: 4 }} showsVerticalScrollIndicator={false}>
      {/* Product Name */}
      <View style={{ zIndex: 10 }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: c.text, marginBottom: 6 }}>Product Name *</Text>
        <TextInput
          style={inputStyle(c, !!errors.name)}
          placeholder="e.g. Maize Flour 2kg"
          placeholderTextColor={c.textSecondary}
          value={(form.name as string) || ''}
          onChangeText={handleNameChange}
        />
        <ProductSuggest suggestions={suggestions} onSelect={handleSelectSuggestion} c={c} />
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

      {/* Image */}
      <TouchableOpacity
        onPress={pickImage}
        style={{
          borderRadius: 10, borderWidth: 1, borderColor: c.border, borderStyle: 'dashed',
          paddingVertical: 24, alignItems: 'center', backgroundColor: c.card,
        }}
      >
        {(form.imageUrl as string) ? (

          <Image size={28} color={c.textSecondary} />
        ) : (

          <Camera size={28} color={c.textSecondary} />
        )}
        <Text style={{ color: c.textSecondary, fontSize: 13, marginTop: 6 }}>
          {(form.imageUrl as string) ? 'Change image' : 'Tap to add image (optional)'}
        </Text>
      </TouchableOpacity>

      {/* Category */}
      <View>
        <Text style={{ fontSize: 13, fontWeight: '700', color: c.text, marginBottom: 6 }}>Category</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            onPress={onOpenCategoryPicker}
            style={{
              ...inputStyle(c),
              flex: 1,
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
          <TouchableOpacity
            onPress={onAddCategory}
            style={{
              width: 48, height: 48, borderRadius: 10,
              backgroundColor: c.brand, justifyContent: 'center', alignItems: 'center',
            }}
          >
            
            <Plus size={20} color={c.card} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Unit */}
      <View>
        <Text style={{ fontSize: 13, fontWeight: '700', color: c.text, marginBottom: 6 }}>Unit</Text>
        <TouchableOpacity
          onPress={onOpenUnitPicker}
          style={{
            ...inputStyle(c),
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          }}
        >
          <Text style={{ color: form.unit ? c.text : c.textSecondary, textTransform: 'capitalize' }}>
            {(form.unit as string) || 'Select unit'}
          </Text>
          
          <ChevronDown size={18} color={c.textSecondary} />
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}
