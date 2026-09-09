// VariantPickerModal — shown when adding a product with variants to cart
// Pure presentation: no business logic, no API calls.

import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native'
import { X } from 'lucide-react-native'
import type { ProductVariant } from '../../lib/types'
import { formatCurrency } from '../../lib/formatters'
import { useTheme } from '../../hooks/useTheme'

interface Props {
  visible: boolean
  productName: string
  variants: ProductVariant[]
  onSelect: (variant: ProductVariant) => void
  onClose: () => void
}

export function VariantPickerModal({ visible, productName, variants, onSelect, onClose }: Props) {
  const { bg, card, text, textSecondary: muted, border, brand: orange } = useTheme()

  return (
    <Modal visible={visible} onRequestClose={onClose} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.container, { backgroundColor: bg }]}>
        <View style={[styles.header, { borderBottomColor: border }]}>
          <View>
            <Text style={[styles.title, { color: text }]}>Select Variation</Text>
            <Text style={[styles.subtitle, { color: muted }]} numberOfLines={1}>{productName}</Text>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <X size={20} color={text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 24 }}>
          {variants.length === 0 ? (
            <View style={styles.empty}>
              <Text style={[styles.emptyText, { color: muted }]}>No variations available</Text>
            </View>
          ) : variants.map((v) => (
            <TouchableOpacity
              key={v.id}
              style={[styles.variantCard, { backgroundColor: card, borderColor: border }]}
              onPress={() => onSelect(v)}
              activeOpacity={0.7}
            >
              <View style={styles.variantInfo}>
                <Text style={[styles.variantName, { color: text }]}>{v.name}</Text>
                {v.sku && <Text style={[styles.variantSku, { color: muted }]}>SKU: {v.sku}</Text>}
                {v.barcode && <Text style={[styles.variantSku, { color: muted }]}>Barcode: {v.barcode}</Text>}
                <Text style={[styles.variantStock, { color: v.stockQuantity <= 0 ? '#ef4444' : muted }]}>
                  {v.stockQuantity <= 0 ? 'Out of stock' : `${v.stockQuantity} in stock`}
                </Text>
              </View>
              <View style={styles.variantPrice}>
                <Text style={[styles.price, { color: orange }]}>
                  {formatCurrency(v.sellingPrice ?? 0)}
                </Text>
                {v.stockQuantity <= 0 && (
                  <Text style={styles.unavailable}>Unavailable</Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: border }]}>
          <TouchableOpacity
            style={[styles.cancelBtn, { borderColor: border }]}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={[styles.cancelText, { color: text }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1,
  },
  title: { fontSize: 18, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 2 },
  body: { flex: 1, padding: 16 },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 14 },
  variantCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 10,
  },
  variantInfo: { flex: 1 },
  variantName: { fontSize: 15, fontWeight: '700' },
  variantSku: { fontSize: 11, marginTop: 2 },
  variantStock: { fontSize: 11, marginTop: 2 },
  variantPrice: { alignItems: 'flex-end' },
  price: { fontSize: 16, fontWeight: '800' },
  unavailable: { fontSize: 11, color: '#ef4444', marginTop: 2 },
  footer: { padding: 16, borderTopWidth: 1 },
  cancelBtn: {
    paddingVertical: 14, borderRadius: 10, alignItems: 'center', borderWidth: 1,
  },
  cancelText: { fontSize: 15, fontWeight: '700' },
})
