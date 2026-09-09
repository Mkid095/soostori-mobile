import { useState } from 'react'
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native'
import { X } from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import type { Product } from '../../lib/types'
import { formatCurrency } from '../../lib/formatters'

interface Props {
  product: Product
  onSelect: (unitPrice: number, quantity: number) => void
  onCancel: () => void
}

export function PriceSelectionDialog({ product, onSelect, onCancel }: Props) {
  const { card, text, textSecondary, border, brand } = useTheme()
  const [selectedPrice, setSelectedPrice] = useState<number>(product.sellingPrice)

  function handleConfirm() {
    onSelect(selectedPrice, 1)
  }

  function radio(selected: boolean) {
    return (
      <View style={[styles.radio, { borderColor: selected ? brand : border }]}>
        {selected && <View style={[styles.radioDot, { backgroundColor: brand }]} />}
      </View>
    )
  }

  return (
    <Modal visible={true} animationType="fade" onRequestClose={onCancel} transparent>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: card, borderColor: border }]}>
          <View style={[styles.header, { borderBottomColor: border }]}>
            <Text style={[styles.headerTitle, { color: text }]}>Select Price</Text>
    // @ts-expect-error
            <TouchableOpacity onPress={onCancel}><X size={16} color={textSecondary} /></TouchableOpacity>
          </View>

          <View style={[styles.productSection, { borderBottomColor: border }]}>
            <Text style={[styles.productName, { color: textSecondary }]} numberOfLines={1}>{product.name}</Text>
          </View>

          <View style={styles.options}>
            <TouchableOpacity
              onPress={() => setSelectedPrice(product.sellingPrice)}
              style={[
                styles.option,
                {
                  borderColor: selectedPrice === product.sellingPrice ? brand : border,
                  backgroundColor: selectedPrice === product.sellingPrice ? `${brand}15` : 'transparent',
                },
              ]}
            >
              {radio(selectedPrice === product.sellingPrice)}
              <Text style={[styles.optionLabel, { color: text }]}>Sell individually</Text>
              <Text style={[styles.optionPrice, { color: brand }]}>{formatCurrency(product.sellingPrice)}</Text>
            </TouchableOpacity>

            {product.groupPrices?.map((gp, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => setSelectedPrice(gp.price)}
                style={[
                  styles.option,
                  {
                    borderColor: selectedPrice === gp.price ? brand : border,
                    backgroundColor: selectedPrice === gp.price ? `${brand}15` : 'transparent',
                  },
                ]}
              >
                {radio(selectedPrice === gp.price)}
                <Text style={[styles.optionLabel, { color: text }]}>
                  Buy {gp.minQuantity} for {formatCurrency(gp.price)}
                </Text>
                <Text style={[styles.optionPrice, { color: brand }]}>{formatCurrency(gp.price)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: border }]}
              onPress={onCancel}
            >
              <Text style={[styles.cancelText, { color: text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: brand }]}
              onPress={handleConfirm}
            >
              <Text style={styles.confirmText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    width: '85%', maxWidth: 360, borderRadius: 20, overflow: 'hidden', borderWidth: 1,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 15, fontWeight: '700' },
  productSection: { paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1 },
  productName: { fontSize: 13, fontWeight: '600' },
  options: { padding: 16, gap: 8 },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, borderRadius: 12, borderWidth: 1.5,
  },
  radio: {
    width: 18, height: 18, borderRadius: 9, borderWidth: 2, justifyContent: 'center', alignItems: 'center',
  },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  optionLabel: { flex: 1, fontSize: 14, fontWeight: '600' },
  optionPrice: { fontSize: 14, fontWeight: '800' },
  actions: { flexDirection: 'row', gap: 12, padding: 16, paddingTop: 8 },
  cancelBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1,
  },
  cancelText: { fontSize: 14, fontWeight: '700' },
  confirmBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  confirmText: { color: '#fff', fontSize: 14, fontWeight: '700' },
})
