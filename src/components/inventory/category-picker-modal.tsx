// CategoryPickerModal — themed scrollable modal picker for selecting existing categories
import { useState } from 'react'
import {
  View, Text, TouchableOpacity, Modal, TextInput,
  ScrollView,
} from 'react-native'
import { X, Search, Check } from 'lucide-react-native'
import type { Category } from '../../lib/types'
import { categoryPickerStyles as s } from './category-picker-styles'

interface Props {
  visible: boolean
  onClose: () => void
  categories: Category[]
  selectedId?: string
  onSelect: (cat: Category) => void
  c: Record<string, string>
}

export function CategoryPickerModal({
  visible, onClose, categories, selectedId, onSelect, c,
}: Props) {
  const [search, setSearch] = useState('')

  const filtered = categories.filter((cat) =>
    cat.name.toLowerCase().includes(search.toLowerCase())
  )

  function handleSelect(cat: Category) {
    onSelect(cat)
    onClose()
    setSearch('')
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={[s.backdrop, { backgroundColor: 'rgba(0,0,0,0.5)' }]} activeOpacity={1} onPress={onClose}>
        <View style={[s.sheet, { backgroundColor: c.card }]} onStartShouldSetResponder={() => true}>
          <View style={[s.header, { borderBottomColor: c.border }]}>
            <Text style={{ fontSize: 17, fontWeight: '800', color: c.text }}>Select Category</Text>
            <TouchableOpacity onPress={onClose} style={[s.closeBtn, { backgroundColor: c.bg }]}>
              
              <X size={20} color={c.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={[s.searchRow, { backgroundColor: c.bg, borderColor: c.border }]}>
            
            <Search size={16} color={c.textSecondary} style={s.searchIcon} />
            <TextInput
              style={[s.searchInput, { color: c.text }]}
              placeholder="Search categories..."
              placeholderTextColor={c.textSecondary}
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
            />
          </View>

          <ScrollView style={s.list} showsVerticalScrollIndicator={false}>
            {filtered.length === 0 ? (
              <Text style={[s.empty, { color: c.textSecondary }]}>No categories found</Text>
            ) : (
              filtered.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    s.item,
                    { borderColor: 'transparent' },
                    selectedId === cat.id && { backgroundColor: c.brand + '15', borderColor: c.brand },
                  ]}
                  onPress={() => handleSelect(cat)}
                >
                  <View style={[s.colorDot, { backgroundColor: cat.color }]} />
                  <Text
                    style={[
                      s.itemText,
                      { color: c.text },
                      selectedId === cat.id && { color: c.brand, fontWeight: '700' },
                    ]}
                  >
                    {cat.name}
                  </Text>
                  {selectedId === cat.id && (
                    <View style={[s.checkBadge, { backgroundColor: c.brand }]}>
                      
                      <Check size={14} color={c.card} />
                    </View>
                  )}
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  )
}
