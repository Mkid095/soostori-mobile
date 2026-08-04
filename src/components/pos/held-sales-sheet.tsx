import { View, Text, TouchableOpacity, Modal, ScrollView, Alert, StyleSheet } from 'react-native'
import { X, Clock, RotateCcw, Trash2, Package } from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import type { HeldSale, CartItem } from '../../lib/types'
import { formatCurrency } from '../../lib/utils'
import { useHeldSales } from '../../hooks/useHeldSales'
import { deleteHeldSale } from '../../services/db-sales'

interface Props {
  visible: boolean
  onRecall: (sale: HeldSale) => void
  onClose: () => void
}

export function HeldSalesSheet({ visible, onRecall, onClose }: Props) {
  const { bg, card, text, textSecondary, border, brand } = useTheme()
  const { data: heldSales = [] } = useHeldSales()

  async function handleDelete(id: string, name?: string) {
    Alert.alert('Delete Held Order', `Delete "${name || 'this order'}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteHeldSale(id) },
    ])
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <View style={[s.container, { backgroundColor: bg }]}>
        <View style={s.handleContainer}><View style={[s.handle, { backgroundColor: border }]} /></View>
        <View style={[s.header, { borderBottomColor: border }]}>
          <View>
            <Text style={[s.hTitle, { color: text }]}>Held Orders</Text>
            <Text style={[s.hSub, { color: textSecondary }]}>{heldSales.length} {heldSales.length === 1 ? 'order' : 'orders'} paused</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={s.closeBtn}><X size={20} color={textSecondary} /></TouchableOpacity>
        </View>
        <ScrollView style={s.list}>
          {heldSales.length === 0 ? (
            <View style={s.empty}>
              <View style={[s.emptyIcon, { backgroundColor: border }]}><Clock size={28} color={textSecondary} strokeWidth={1.6} /></View>
              <Text style={[s.emptyTitle, { color: text }]}>No held orders</Text>
              <Text style={[s.emptySub, { color: textSecondary }]}>Tap Hold on a cart to save it here for later</Text>
            </View>
          ) : heldSales.map((sale) => (
            <HeldSaleRow key={sale.id} sale={sale} onRecall={onRecall} onDelete={handleDelete} onClose={onClose} text={text} textSecondary={textSecondary} brand={brand} border={border} card={card} />
          ))}
        </ScrollView>
      </View>
    </Modal>
  )
}

function HeldSaleRow({ sale, onRecall, onDelete, onClose, text, textSecondary, brand, border, card }: {
  sale: HeldSale; onRecall: (s: HeldSale) => void; onDelete: (id: string, name?: string) => void
  onClose: () => void; text: string; textSecondary: string; brand: string; border: string; card: string
}) {
  const items: CartItem[] = sale.cartItems || []
  const total = items.reduce((sum, i) => sum + (i.totalPrice || 0), 0)
  const itemCount = items.reduce((sum, i) => sum + (i.quantity || 0), 0)

  return (
    <View style={[s.row, { borderColor: border, backgroundColor: card }]}>
      <View style={s.rowPreview}>
        <Text style={[s.rowName, { color: text }]} numberOfLines={1}>{sale.name || 'Held Order'}</Text>
        <View style={s.rowMeta}>
          <Package size={10} color={textSecondary} />
          <Text style={[s.rowMetaText, { color: textSecondary }]}>{itemCount} {itemCount === 1 ? 'item' : 'items'}</Text>
          <Text style={{ color: textSecondary }}> · </Text>
          <Text style={[s.rowTotal, { color: brand }]}>{formatCurrency(total)}</Text>
        </View>
        <Text style={[s.rowDate, { color: textSecondary }]}>{new Date(sale.createdAt).toLocaleString()}</Text>
      </View>
      <TouchableOpacity style={[s.recallBtn, { backgroundColor: brand }]} onPress={() => { onRecall(sale); onClose() }}>
        <RotateCcw size={11} color="#fff" /><Text style={s.recallText}>Recall</Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.deleteBtn} onPress={() => onDelete(sale.id, sale.name)}>
        <Trash2 size={15} color="#ef4444" />
      </TouchableOpacity>
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1 },
  handleContainer: { alignItems: 'center', paddingTop: 8, paddingBottom: 4 },
  handle: { width: 40, height: 4, borderRadius: 2 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  hTitle: { fontSize: 16, fontWeight: '800' },
  hSub: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', marginTop: 2 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  list: { flex: 1, paddingHorizontal: 12, paddingTop: 8 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyIcon: { width: 64, height: 64, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  emptyTitle: { fontSize: 14, fontWeight: '700' },
  emptySub: { fontSize: 12, textAlign: 'center', marginTop: 4, maxWidth: 200 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  rowPreview: { flex: 1, minWidth: 0 },
  rowName: { fontSize: 13, fontWeight: '700' },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  rowMetaText: { fontSize: 11 },
  rowTotal: { fontSize: 11, fontWeight: '800' },
  rowDate: { fontSize: 10, marginTop: 2 },
  recallBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, minWidth: 72, justifyContent: 'center' },
  recallText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  deleteBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
})
