// app/products/[id].tsx — Product detail: view/edit, archive, adjust stock
import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Alert, Modal,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { ArrowLeft, Edit2, Archive, Package, Plus, Minus } from 'lucide-react-native'
import { useTheme } from '../../src/hooks/useTheme'
import { getProductById } from '../../src/services/db-products'
import { adjustStock } from '../../src/services/db-products'
import { deleteProduct } from '../../src/services/db-products'
import { updateProduct } from '../../src/services/db-products'
import { getAllCategories } from '../../src/services/db-categories'
import { createCategory } from '../../src/services/db-categories'
import type { Product, Category } from '../../src/lib/types'
import { formatCurrency } from '../../src/lib/formatters'
import { ConfirmModal } from '../../src/components/shared/confirm-modal'
import { AddCategoryDialog } from '../../src/components/inventory/add-category-dialog'
import { useProductsRefresh } from '../../src/hooks/useProducts'
import { STOCK_REASONS, type StockReason } from '../../src/components/inventory/inventory-types'

const PRESET_COLORS = [
  '#F97316', '#EF4444', '#F59E0B', '#22C55E',
  '#3B82F6', '#8B5CF6', '#EC4899', '#06B6D4',
]

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const theme = useTheme()
  const { bg, card, text, textSecondary: muted, border, brand: orange, success, danger } = theme
  const refreshProducts = useProductsRefresh()

  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [showArchive, setShowArchive] = useState(false)
  const [archiving, setArchiving] = useState(false)

  // Stock adjust state
  const [showStockAdj, setShowStockAdj] = useState(false)
  const [stockDelta, setStockDelta] = useState('')
  const [stockReason, setStockReason] = useState<StockReason>('Adjustment')
  const [stockSaving, setStockSaving] = useState(false)

  // Edit form state
  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [categoryName, setCategoryName] = useState('')
  const [categoryColor, setCategoryColor] = useState('#f97316')
  const [costPrice, setCostPrice] = useState('')
  const [sellingPrice, setSellingPrice] = useState('')
  const [stockQty, setStockQty] = useState('')
  const [lowStockThreshold, setLowStockThreshold] = useState('')
  const [trackInventory, setTrackInventory] = useState(true)
  const [saving, setSaving] = useState(false)

  // Category picker
  const [categories, setCategories] = useState<Category[]>([])
  const [showCategoryPicker, setShowCategoryPicker] = useState(false)
  const [showAddCategory, setShowAddCategory] = useState(false)

  const loadProduct = useCallback(async () => {
    if (!id) return
    try {
      const p = await getProductById(id)
      setProduct(p)
      if (p) {
        setName(p.name)
        setSku(p.sku || '')
        setCategoryId(p.categoryId || '')
        setCategoryName(p.categoryName || '')
        setCategoryColor(p.categoryColor || '#f97316')
        setCostPrice(String(p.costPrice))
        setSellingPrice(String(p.sellingPrice))
        setStockQty(String(p.stockQuantity))
        setLowStockThreshold(String(p.lowStockThreshold))
        setTrackInventory(p.trackInventory)
      }
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { loadProduct() }, [loadProduct])

  async function loadCategories() {
    const cats = await getAllCategories()
    setCategories(cats)
  }

  async function handleSave() {
    if (!product || !name.trim()) { Alert.alert('Required', 'Product name is required'); return }
    setSaving(true)
    try {
      await updateProduct(product.id, {
        name: name.trim(),
        sku: sku.trim() || undefined,
        categoryId: categoryId || undefined,
        categoryName: categoryName || undefined,
        categoryColor: categoryColor || undefined,
        costPrice: parseFloat(costPrice) || 0,
        sellingPrice: parseFloat(sellingPrice) || 0,
        stockQuantity: parseInt(stockQty) || 0,
        lowStockThreshold: parseInt(lowStockThreshold) || 10,
        trackInventory,
      })
      await loadProduct()
      refreshProducts()
      setEditing(false)
    } catch {
      Alert.alert('Error', 'Failed to save product')
    } finally {
      setSaving(false)
    }
  }

  async function handleArchive() {
    if (!product) return
    setArchiving(true)
    try {
      await deleteProduct(product.id)
      refreshProducts()
      router.back()
    } catch {
      Alert.alert('Error', 'Failed to archive product')
      setArchiving(false)
    }
  }

  async function handleStockAdjust() {
    if (!product) return
    const delta = parseInt(stockDelta)
    if (isNaN(delta) || delta === 0) { Alert.alert('Invalid', 'Enter a stock adjustment value'); return }
    setStockSaving(true)
    try {
      await adjustStock(product.id, delta, stockReason)
      await loadProduct()
      refreshProducts()
      setShowStockAdj(false)
      setStockDelta('')
    } catch {
      Alert.alert('Error', 'Failed to adjust stock')
    } finally {
      setStockSaving(false)
    }
  }

  async function handleCategoryCreated(newName: string, newColor: string) {
    const cat = await createCategory({ name: newName, color: newColor, isActive: true })
    await loadCategories()
    setCategoryId(cat.id)
    setCategoryName(cat.name)
    setCategoryColor(cat.color)
  }

  function newStock() {
    if (!product) return 0
    return product.stockQuantity + (parseInt(stockDelta) || 0)
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: muted }}>Loading...</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (!product) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>
        <View style={[styles.header, { backgroundColor: card, borderBottomWidth: 1, borderBottomColor: border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={22} color={text} />
          </TouchableOpacity>
          <Text style={{ fontSize: 17, fontWeight: '800', color: text }}>Product Not Found</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Package size={48} color={muted} />
          <Text style={{ color: muted, marginTop: 12 }}>Product not found</Text>
        </View>
      </SafeAreaView>
    )
  }

  const isLow = product.trackInventory && product.stockQuantity <= product.lowStockThreshold
  const isOut = product.trackInventory && product.stockQuantity === 0

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['bottom']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: card, borderBottomWidth: 1, borderBottomColor: border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={text} />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: '800', color: text }} numberOfLines={1}>
          {editing ? 'Edit Product' : product.name}
        </Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {!editing && (
            <>
              <TouchableOpacity style={styles.headerBtn} onPress={() => setEditing(true)}>
                <Edit2 size={18} color={orange} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerBtn} onPress={() => setShowArchive(true)}>
                <Archive size={18} color={danger} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {editing ? (
          // Edit mode
          <View style={{ gap: 16 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: muted }}>Name *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: card, color: text, borderColor: border }]}
              value={name}
              onChangeText={setName}
              placeholder="Product name"
              placeholderTextColor={muted}
            />

            <Text style={{ fontSize: 13, fontWeight: '600', color: muted }}>SKU</Text>
            <TextInput
              style={[styles.input, { backgroundColor: card, color: text, borderColor: border }]}
              value={sku}
              onChangeText={setSku}
              placeholder="SKU (optional)"
              placeholderTextColor={muted}
            />

            <Text style={{ fontSize: 13, fontWeight: '600', color: muted }}>Category</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                style={[styles.input, { flex: 1, backgroundColor: card, borderColor: border, justifyContent: 'center' }]}
                onPress={() => { loadCategories(); setShowCategoryPicker(true) }}
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

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: muted }}>Cost Price (KES)</Text>
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
                <Text style={{ fontSize: 13, fontWeight: '600', color: muted }}>Selling Price (KES)</Text>
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

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: muted }}>Stock Quantity</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: card, color: text, borderColor: border }]}
                  value={stockQty}
                  onChangeText={setStockQty}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={muted}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: muted }}>Low-Stock Threshold</Text>
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

            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 }}
              onPress={() => setTrackInventory(!trackInventory)}
            >
              <Text style={{ color: text, fontWeight: '600' }}>Track Inventory</Text>
              <View style={{ width: 50, height: 28, borderRadius: 14, backgroundColor: trackInventory ? success : border, padding: 2 }}>
                <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff', alignSelf: trackInventory ? 'flex-end' : 'flex-start' }} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ backgroundColor: saving ? muted : orange, borderRadius: 10, paddingVertical: 14, alignItems: 'center' }}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ borderRadius: 10, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: border }}
              onPress={() => { setEditing(false); loadProduct() }}
            >
              <Text style={{ color: text, fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          // View mode
          <View style={{ gap: 16 }}>
            {/* Status badge */}
            {product.trackInventory && (
              <View style={[styles.statusBanner, { backgroundColor: isOut ? '#ef444420' : isLow ? '#f59e0b20' : '#22c55e20' }]}>
                <Text style={{ color: isOut ? '#ef4444' : isLow ? '#f59e0b' : '#22c55e', fontWeight: '800' }}>
                  {isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'}
                </Text>
                <Text style={{ color: isOut ? '#ef4444' : isLow ? '#f59e0b' : '#22c55e' }}>
                  {product.stockQuantity} units · threshold: {product.lowStockThreshold}
                </Text>
              </View>
            )}

            {/* Quick stock adjust */}
            {product.trackInventory && (
              <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: text, marginBottom: 12 }}>Adjust Stock</Text>
                <TouchableOpacity
                  style={{ backgroundColor: orange, borderRadius: 10, paddingVertical: 12, alignItems: 'center' }}
                  onPress={() => { setShowStockAdj(true); loadCategories() }}
                >
                  <Text style={{ color: '#fff', fontWeight: '800' }}>Adjust Stock (+/-)</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Details card */}
            <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: text, marginBottom: 12 }}>Details</Text>

              {[
                ['Selling Price', formatCurrency(product.sellingPrice)],
                ['Cost Price', formatCurrency(product.costPrice)],
                ['SKU', product.sku || '—'],
                ['Barcode', product.barcode || '—'],
                ['Unit', product.unit],
                ['Track Inventory', product.trackInventory ? 'Yes' : 'No'],
              ].map(([label, value]) => (
                <View key={label} style={[styles.detailRow, { borderBottomColor: border }]}>
                  <Text style={{ fontSize: 13, color: muted }}>{label}</Text>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: text }}>{value}</Text>
                </View>
              ))}

              {product.distributorName && (
                <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
                  <Text style={{ fontSize: 13, color: muted }}>Distributor</Text>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: text }}>{product.distributorName}</Text>
                </View>
              )}
            </View>

            {/* Category */}
            {product.categoryName && (
              <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
                <Text style={{ fontSize: 13, color: muted, marginBottom: 4 }}>Category</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: product.categoryColor || orange }} />
                  <Text style={{ fontSize: 15, fontWeight: '700', color: text }}>{product.categoryName}</Text>
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Archive confirm */}
      <ConfirmModal
        visible={showArchive}
        title="Archive Product"
        message={`Archive "${product.name}"? It will no longer appear in your product list but data is preserved.`}
        confirmLabel="Archive"
        destructive
        onCancel={() => setShowArchive(false)}
        onConfirm={handleArchive}
      />

      {/* Stock adjust modal */}
      <Modal visible={showStockAdj} transparent animationType="slide" onRequestClose={() => setShowStockAdj(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalPanel, { backgroundColor: card, borderTopWidth: 1, borderTopColor: border }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 17, fontWeight: '800', color: text }}>Adjust Stock</Text>
              <TouchableOpacity onPress={() => setShowStockAdj(false)}>
                <Text style={{ color: muted, fontSize: 15 }}>Cancel</Text>
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginBottom: 16 }}>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 12, color: muted }}>Current</Text>
                <Text style={{ fontSize: 26, fontWeight: '800', color: text }}>{product.stockQuantity}</Text>
              </View>
              <Text style={{ fontSize: 20, color: muted }}>→</Text>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 12, color: muted }}>New</Text>
                <Text style={{ fontSize: 26, fontWeight: '800', color: newStock() < 0 ? danger : text }}>
                  {newStock()}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <TouchableOpacity
                style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: bg, borderWidth: 1, borderColor: border, justifyContent: 'center', alignItems: 'center' }}
                onPress={() => setStockDelta((d) => String(parseInt(d || '0') - 1))}
              >
                <Minus size={20} color={text} />
              </TouchableOpacity>
              <TextInput
                style={[styles.input, { flex: 1, textAlign: 'center', fontSize: 20, fontWeight: '800', backgroundColor: bg, color: text, borderColor: border }]}
                value={stockDelta}
                onChangeText={setStockDelta}
                keyboardType="number-pad"
                placeholder="+/- quantity"
                placeholderTextColor={muted}
              />
              <TouchableOpacity
                style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: bg, borderWidth: 1, borderColor: border, justifyContent: 'center', alignItems: 'center' }}
                onPress={() => setStockDelta((d) => String(parseInt(d || '0') + 1))}
              >
                <Plus size={20} color={text} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 13, fontWeight: '600', color: muted, marginBottom: 8 }}>Reason</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              {STOCK_REASONS.map((r) => (
                <TouchableOpacity
                  key={r}
                  onPress={() => setStockReason(r)}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 12,
                    backgroundColor: stockReason === r ? orange : bg,
                    borderWidth: 1, borderColor: stockReason === r ? orange : border,
                  }}
                >
                  <Text style={{ color: stockReason === r ? '#fff' : text, fontWeight: '700', fontSize: 12 }}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={{ backgroundColor: stockSaving || !stockDelta ? muted : success, borderRadius: 10, paddingVertical: 14, alignItems: 'center' }}
              onPress={handleStockAdjust}
              disabled={stockSaving || !stockDelta}
            >
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>
                {stockSaving ? 'Saving...' : `Update (+${stockDelta || 0})`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Category picker */}
      <Modal visible={showCategoryPicker} transparent animationType="fade" onRequestClose={() => setShowCategoryPicker(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} activeOpacity={1} onPress={() => setShowCategoryPicker(false)}>
          <View style={{ flex: 1, justifyContent: 'flex-end' }}>
            <View style={[styles.modalPanel, { backgroundColor: card, borderRadius: 16 }]}>
              <Text style={{ fontSize: 17, fontWeight: '800', color: text, marginBottom: 16 }}>Select Category</Text>
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
                  {categoryId === cat.id && <Text style={{ color: success, fontWeight: '700' }}>Selected</Text>}
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
  headerBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  card: { borderRadius: 12, padding: 16, borderWidth: 1 },
  statusBanner: { borderRadius: 10, padding: 12, alignItems: 'center', gap: 4 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1 },
  input: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, borderWidth: 1 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalPanel: { padding: 20 },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1 },
})
