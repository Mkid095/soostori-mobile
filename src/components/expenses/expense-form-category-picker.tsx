// ExpenseFormCategoryPicker — inline category picker for the expense form modal.
// Pure presentation: emits selection events.

import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import { X } from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import type { ExpenseCategory } from '../../lib/types'

interface Props {
  categories: ExpenseCategory[]
  selectedId: string
  onSelect: (id: string) => void
  onClose: () => void
}

export function ExpenseFormCategoryPicker({ categories, selectedId, onSelect, onClose }: Props) {
  const { card, text, border, brand } = useTheme()
  const selected = categories.find((c) => c.id === selectedId)

  return (
    <View style={[s.overlay, { backgroundColor: card }]}>
      <View style={[s.header, { borderBottomColor: border }]}>
        <Text style={[s.title, { color: text }]}>Select Category</Text>
        <TouchableOpacity onPress={onClose}><X size={18} color={text} /></TouchableOpacity>
      </View>
      <ScrollView style={{ maxHeight: 300 }}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[s.item, { borderBottomColor: border }]}
            onPress={() => { onSelect(cat.id); onClose() }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
              <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: cat.color }} />
              <Text style={{ color: text, fontSize: 15 }}>{cat.name}</Text>
            </View>
            {selectedId === cat.id && <Text style={{ color: brand, fontWeight: '700' }}>Selected</Text>}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  overlay: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  title: { fontSize: 16, fontWeight: '800' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1 },
})
