// app/products/new.tsx — Create new product
import { useState, useEffect } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Alert, Modal,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { ArrowLeft, Plus, Check } from 'lucide-react-native'
import { useTheme } from '../../src/hooks/useTheme'
import { createProduct } from '../../src/services/db-products'
import { createCategory } from '../../src/services/db-categories'
import { getAllCategories } from '../../src/services/db-categories'
import type { Category } from '../../src/lib/types'
import { AddCategoryDialog } from '../../src/components/inventory/add-category-dialog'
import { useProductsRefresh } from '../../src/hooks/useProducts'
import { STOCK_REASONS, type StockReason } from '../../src/components/inventory/inventory-types'

const PRESET_COLORS = [
  '#F97316', '#EF4444', '#F59E0B', '#22C55E',
  '#3B82F6', '#8B5CF6', '#EC4899', '#06B6D4',
]

export default function NewProductScreen() {
  const router = useRouter()
  const theme = useTheme()
  const { bg, card, text, textSecondary: muted, border, brand: orange, success } = theme
  const refreshProducts = useProductsRefresh()

  // Form state
  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [categoryName, setCategoryName] = useState('')
  const [categoryColor, setCategoryColor] = useState('#f97316')
  const [description, setDescription] = useState('')
  const [costPrice, setCostPrice] = useState('')
  const [sellingPrice, setSellingPrice] = useState('')
  const [stockQuantity, setStockQuantity] = useState('')
  const [lowStockThreshold, setLowStockThreshold] = useState('10')
  const [trackInventory, setTrackInventory] = useState(true)
  const [saving, setSaving] = useState(false)

  // Category picker
  const [categories, setCategories] = useState<Category[]>([])
  const [showCategoryPicker, setShowCategoryPicker] = useState(false)
  const [showAddCategory, setShowAddCategory] = useState(false)

  useEffect(() => {
    getAllCategories().then(setCategories).catch(() => {})
  }, [])

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('Required', 'Product name is required')
      return
    }
    if (!sellingPrice || parseFloat(sellingPrice) <= 0) {
      Alert.alert('Required', 'Selling price must be greater than 0')
      return
    }
    setSaving(true)
    try {
      await createProduct({
        name: name.trim(),
        sku: sku.trim() || undefined,
        categoryId: categoryId || undefined,
        categoryName: categoryName || undefined,
        categoryColor: categoryColor || undefined,
        costPrice: parseFloat(costPrice) || 0,
        sellingPrice: parseFloat(sellingPrice),
        stockQuantity: parseInt(stockQuantity) || 0,
        lowStockThreshold: parseInt(lowStockThreshold) || 10,
        trackInventory,
        unit: 'piece',
        allowSingleUnitSale: true,
        isActive: true,
      })
      await refreshProducts()
      router.back()
    } catch (err) {
      Alert.alert('Error', 'Failed to create product')
    } finally {
      setSaving(false)
    }
  }

  async function handleCategoryCreated(newName: string, newColor: string) {
    const cat = await createCategory({ name: newName, color: newColor, isActive: true })
    await getAllCategories().then(setCategories).catch(() => {})
    setCategoryId(cat.id)
    setCategoryName(cat.name)
    setCategoryColor(cat.color)
  }

  const canSave = name.trim().length > 0 && parseFloat(sellingPrice) > 0

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['bottom']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: card, borderBottomWidth: 1, borderBottomColor: border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={text} />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: '800', color: text }}>New Product</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {/* Name */}
        <Text style={{ fontSize: 13, fontWeight: '600', color: muted, marginBottom: 6 }}>Name *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: card, color: text, borderColor: border }]}
          value={name}
          onChangeText={setName}
          placeholder="Product name"
          placeholderTextColor={muted}
        />

        {/* SKU */}
        <Text style={{ fontSize: 13, fontWeight: '600', color: muted, marginBottom: 6, marginTop: 14 }}>SKU</Text>
        <TextInput
          style={[styles.input, { backgroundColor: card, color: text, borderColor: border }]}
          value={sku}
          onChangeText={setSku}
          placeholder="Auto-generated if blank"
          placeholderTextColor={muted}
        />

        {/* Category */}
        <Text style={{ fontSize: 13, fontWeight: '600', color: muted, marginBottom: 6, marginTop: 14 }}>Category</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            style={[styles.input, { flex: 1, backgroundColor: card, borderColor: border, justifyContent: 'center' }]}
            onPress={() => setShowCategoryPicker(true)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {categoryColor && <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: categoryColor }} />}
              <Text style={{ color: categoryName ? text : muted }}>{categoryName || 'Select category'}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ backgroundColor: orange, borderRadius: 10, paddingHorizontal: 14, justifyContent: 'center' }}
            onPress={() => setShowAddCategory(true)}
          >
            <Text style={{ color: '#fff', fontWeight: '700' }}>+ New</Text>
          </TouchableOpacity>
        </View>

        {/* Description */}
        <Text style={{ fontSize: 13, fontWeight: '600', color: muted, marginBottom: 6, marginTop: 14 }}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea, { backgroundColor: card, color: text, borderColor: border }]}
          value={description}
          onChangeText={setDescription}
          placeholder="Optional description"
          placeholderTextColor={muted}
          multiline
          numberOfLines={3}
        />

        {/* Prices */}
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 14 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: muted, marginBottom: 6 }}>Cost Price (KES)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: card, color: text, borderColor: border }]}
              value={costPrice}
              onChangeText={setCostPrice}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={muted}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: muted, marginBottom: 6 }}>Selling Price (KES) *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: card, color: text, borderColor: border }]}
              value={sellingPrice}
              onChangeText={setSellingPrice}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={muted}
            />
          </View>
        </View>

        {/* Stock */}
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 14 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: muted, marginBottom: 6 }}>Initial Stock</Text>
            <TextInput
              style={[styles.input, { backgroundColor: card, color: text, borderColor: border }]}
              value={stockQuantity}
              onChangeText={setStockQuantity}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={muted}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: muted, marginBottom: 6 }}>Low-Stock Threshold</Text>
            <TextInput
              style={[styles.input, { backgroundColor: card, color: text, borderColor: border }]}
              value={lowStockThreshold}
              onChangeText={setLowStockThreshold}
              keyboardType="numeric"
              placeholder="10"
              placeholderTextColor={muted}
            />
          </View>
        </View>

        {/* Track inventory toggle */}
        <TouchableOpacity
          style={[styles.toggleRow, { borderColor: border }]}
          onPress={() => setTrackInventory(!trackInventory)}
        >
          <View>
            <Text style={{ color: text, fontWeight: '600', fontSize: 15 }}>Track Inventory</Text>
            <Text style={{ color: muted, fontSize: 12, marginTop: 2 }}>Monitor stock levels for this product</Text>
          </View>
          <View style={{ width: 50, height: 28, borderRadius: 14, backgroundColor: trackInventory ? success : border, padding: 2 }}>
            <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff', alignSelf: trackInventory ? 'flex-end' : 'flex-start' }} />
          </View>
        </TouchableOpacity>

        {/* Submit */}
        <TouchableOpacity
          style={{ backgroundColor: saving || !canSave ? muted : orange, borderRadius: 10, paddingVertical: 15, alignItems: 'center', marginTop: 24 }}
          onPress={handleSave}
          disabled={saving || !canSave}
        >
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>
            {saving ? 'Creating...' : 'Create Product'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Category picker */}
      <Modal visible={showCategoryPicker} transparent animationType="fade" onRequestClose={() => setShowCategoryPicker(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} activeOpacity={1} onPress={() => setShowCategoryPicker(false)}>
          <View style={{ flex: 1, justifyContent: 'flex-end' }}>
            <View style={[styles.pickerPanel, { backgroundColor: card }]}>
              <Text style={{ fontSize: 17, fontWeight: '800', color: text, marginBottom: 16 }}>Select Category</Text>
              {categories.length === 0 && (
                <Text style={{ color: muted, textAlign: 'center', paddingVertical: 20 }}>No categories yet</Text>
              )}
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.catRow, { borderBottomColor: border }]}
                  onPress={() => {
                    setCategoryId(cat.id)
                    setCategoryName(cat.name)
                    setCategoryColor(cat.color)
                    setShowCategoryPicker(false)
                  }}
                >
                  <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: cat.color }} />
                  <Text style={{ flex: 1, color: text, fontWeight: '600' }}>{cat.name}</Text>
                  {categoryId === cat.id && <Check size={16} color={success} />}
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={{ marginTop: 12, paddingVertical: 14, alignItems: 'center' }}
                onPress={() => { setShowCategoryPicker(false); setShowAddCategory(true) }}
              >
                <Text style={{ color: orange, fontWeight: '800' }}>+ New Category</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Add category dialog */}
      <AddCategoryDialog
        visible={showAddCategory}
        onClose={() => setShowAddCategory(false)}
        onCreated={handleCategoryCreated}
        c={theme}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, minHeight: 52 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  input: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, borderWidth: 1 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, marginTop: 20, borderTopWidth: 1, borderBottomWidth: 1 },
  pickerPanel: { borderRadius: 16, padding: 20, maxHeight: '70%' },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1 },
})
