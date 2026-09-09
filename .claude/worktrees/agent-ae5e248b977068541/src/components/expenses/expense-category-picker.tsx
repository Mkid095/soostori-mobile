// CategoryPicker — modal to filter expenses by category.
// Pure presentation: emits selection events.

import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native'
import { X } from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import type { ExpenseCategory } from '../../lib/types'

interface Props {
  visible: boolean
  categories: ExpenseCategory[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  onClose: () => void
}

export function CategoryPicker({ visible, categories, selectedId, onSelect, onClose }: Props) {
  const { card, text, border, brand } = useTheme()

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={[s.modal, { backgroundColor: card, borderColor: border }]}>
          <View style={[s.header, { borderBottomColor: border }]}>
            <Text style={{ color: text, fontWeight: '800', fontSize: 16 }}>Filter by Category</Text>
            <TouchableOpacity onPress={onClose}><X size={18} color={text} /></TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[s.item, { borderBottomColor: border }]}
            onPress={() => { onSelect(null); onClose() }}
          >
            <Text style={{ color: !selectedId ? brand : text, fontWeight: !selectedId ? '800' : '400', flex: 1 }}>
              All Categories
            </Text>
            {!selectedId && <Text style={{ color: brand, fontWeight: '700' }}>Active</Text>}
          </TouchableOpacity>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[s.item, { borderBottomColor: border }]}
              onPress={() => { onSelect(cat.id); onClose() }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: cat.color }} />
                <Text style={{ color: text }}>{cat.name}</Text>
              </View>
              {selectedId === cat.id && <Text style={{ color: brand, fontWeight: '700' }}>Active</Text>}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>
  )
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modal: { width: 300, borderRadius: 16, paddingBottom: 20, borderWidth: 1, overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1 },
})
