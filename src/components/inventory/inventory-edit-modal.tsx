import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, Modal, Alert, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '../../hooks/useTheme'
import type { Product } from '../../lib/types'
import { updateProduct } from '../../services/db-products'
import { formatCurrency } from '../../lib/utils'

interface Props {
  product: Product | null
  onClose: () => void
  onSaved: () => void
}

export function InventoryEditModal({ product, onClose, onSaved }: Props) {
  const { bg, card, text, textSecondary: textMuted, border, brand: orange } = useTheme()

  const [name, setName] = useState(product?.name ?? '')
  const [barcode, setBarcode] = useState(product?.barcode ?? '')
  const [price, setPrice] = useState(String(product?.sellingPrice ?? 0))
  const [cost, setCost] = useState(String(product?.costPrice ?? 0))
  const [stock, setStock] = useState(String(product?.stockQuantity ?? 0))
  const [lowStock, setLowStock] = useState(String(product?.lowStockThreshold ?? 10))
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!product) return
    if (!name.trim()) { Alert.alert('Required', 'Product name is required'); return }
    setSaving(true)
    try {
      await updateProduct(product.id, {
        name: name.trim(),
        barcode: barcode.trim() || undefined,
        sellingPrice: parseFloat(price) || 0,
        costPrice: parseFloat(cost) || 0,
        stockQuantity: parseInt(stock) || 0,
        lowStockThreshold: parseInt(lowStock) || 10,
      })
      onSaved()
      onClose()
    } catch {
      Alert.alert('Error', 'Failed to save product')
    } finally { setSaving(false) }
  }

  return (
    <Modal visible={!!product} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: border, backgroundColor: card }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: text }}>Edit Product</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ color: orange, fontWeight: '700', fontSize: 15 }}>Close</Text>
          </TouchableOpacity>
        </View>
        <View style={{ padding: 16, gap: 10 }}>
          <TextInput style={[styles.input, { backgroundColor: card, color: text, borderColor: border }]} placeholder="Name" placeholderTextColor={textMuted} value={name} onChangeText={setName} />
          <TextInput style={[styles.input, { backgroundColor: card, color: text, borderColor: border }]} placeholder="Barcode" placeholderTextColor={textMuted} value={barcode} onChangeText={setBarcode} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TextInput style={[styles.input, { flex: 1, backgroundColor: card, color: text, borderColor: border }]} placeholder="Selling" placeholderTextColor={textMuted} value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
            <TextInput style={[styles.input, { flex: 1, backgroundColor: card, color: text, borderColor: border }]} placeholder="Cost" placeholderTextColor={textMuted} value={cost} onChangeText={setCost} keyboardType="decimal-pad" />
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TextInput style={[styles.input, { flex: 1, backgroundColor: card, color: text, borderColor: border }]} placeholder="Stock" placeholderTextColor={textMuted} value={stock} onChangeText={setStock} keyboardType="number-pad" />
            <TextInput style={[styles.input, { flex: 1, backgroundColor: card, color: text, borderColor: border }]} placeholder="Low" placeholderTextColor={textMuted} value={lowStock} onChangeText={setLowStock} keyboardType="number-pad" />
          </View>
          <Text style={{ color: textMuted, fontSize: 12, marginTop: 4 }}>Selling: {formatCurrency(parseFloat(price) || 0)}</Text>
        </View>
        <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: border, backgroundColor: card }}>
          <TouchableOpacity style={{ backgroundColor: saving ? '#94a3b8' : '#22c55e', borderRadius: 10, paddingVertical: 14, alignItems: 'center' }} onPress={handleSave} disabled={saving}>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>{saving ? 'Saving...' : 'Save Changes'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  input: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, borderWidth: 1 },
})
