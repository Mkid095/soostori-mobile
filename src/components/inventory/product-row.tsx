// Product row and stock badge for inventory list
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Edit2, Trash2, Plus, Package, AlertTriangle, XCircle } from 'lucide-react-native'
import type { Product } from '../../lib/types'
import { formatCurrency } from '../../lib/formatters'

const badge = { flexDirection: 'row' as const, alignItems: 'center' as const, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 }

export function StockBadge({ qty, threshold }: { qty: number; threshold: number }) {
  const { success, warning, danger } = {
    success: '#22c55e',
    warning: '#f59e0b',
    danger: '#ef4444',
  }
  if (qty === 0) {
    return (
      <View style={[badge, { backgroundColor: danger + '20' }]}>
    // @ts-expect-error
        <XCircle size={10} color={danger} />
        <Text style={{ color: danger, fontSize: 10, fontWeight: '800', marginLeft: 3 }}>OUT</Text>
      </View>
    )
  }
  if (qty <= threshold) {
    return (
      <View style={[badge, { backgroundColor: warning + '20' }]}>
    // @ts-expect-error
        <AlertTriangle size={10} color={warning} />
        <Text style={{ color: warning, fontSize: 10, fontWeight: '800', marginLeft: 3 }}>LOW</Text>
      </View>
    )
  }
  return (
    <View style={[badge, { backgroundColor: success + '20' }]}>
    // @ts-expect-error
      <Package size={10} color={success} />
      <Text style={{ color: success, fontSize: 10, fontWeight: '800', marginLeft: 3 }}>OK</Text>
    </View>
  )
}

export function ProductRow({ product, onEdit, onRestock, onDelete, theme }: {
  product: Product
  onEdit: () => void
  onRestock: () => void
  onDelete: () => void
  theme: any
}) {
  const { card, text, textSecondary: muted, border, brand: orange, success, warning, danger } = theme

  const stockBarWidth = Math.min(100, (product.stockQuantity / Math.max(product.lowStockThreshold * 3, 1)) * 100)
  const barColor = product.stockQuantity === 0 ? danger : product.stockQuantity <= product.lowStockThreshold ? warning : success

  return (
    <View style={[styles.container, { backgroundColor: card, borderColor: border }]}>
      {/* Left: info */}
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontWeight: '700', fontSize: 15, color: text, flex: 1 }} numberOfLines={1}>
            {product.name}
          </Text>
          {product.trackInventory && (
            <StockBadge qty={product.stockQuantity} threshold={product.lowStockThreshold} />
          )}
        </View>

        {product.categoryName && (
          <Text style={{ fontSize: 11, color: product.categoryColor || orange, fontWeight: '600', marginTop: 2 }}>
            {product.categoryName}
          </Text>
        )}
        {product.barcode && (
          <Text style={{ fontSize: 10, color: muted, marginTop: 1 }}>{product.barcode}</Text>
        )}

        <View style={{ flexDirection: 'row', gap: 12, marginTop: 6, alignItems: 'center' }}>
          <Text style={{ fontSize: 14, fontWeight: '800', color: orange }}>
            {formatCurrency(product.sellingPrice)}
          </Text>
          {product.costPrice > 0 && (
            <Text style={{ fontSize: 11, color: muted }}>cost {formatCurrency(product.costPrice)}</Text>
          )}
        </View>

        {product.trackInventory && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ height: 4, borderRadius: 2, width: 60, backgroundColor: border, overflow: 'hidden' }}>
                <View style={{ height: '100%', width: `${stockBarWidth}%`, backgroundColor: barColor, borderRadius: 2 }} />
              </View>
              <Text style={{ fontSize: 11, color: muted }}>{product.stockQuantity} units</Text>
            </View>
          </View>
        )}
      </View>

      {/* Right: actions */}
      <View style={{ marginLeft: 10, gap: 6, alignItems: 'flex-end' }}>
        <TouchableOpacity style={actionBtn(orange)} onPress={onEdit}>
    // @ts-expect-error
          <Edit2 size={13} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 11, marginLeft: 4 }}>Edit</Text>
        </TouchableOpacity>
        {product.trackInventory && (
          <TouchableOpacity style={actionBtn(success)} onPress={onRestock}>
    // @ts-expect-error
            <Plus size={13} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 11, marginLeft: 4 }}>Restock</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={actionBtn(danger)} onPress={onDelete}>
    // @ts-expect-error
          <Trash2 size={13} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 11, marginLeft: 4 }}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

function actionBtn(color: string) {
  return {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: color,
  }
}

const styles = StyleSheet.create({
  container: { borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1 },
})
