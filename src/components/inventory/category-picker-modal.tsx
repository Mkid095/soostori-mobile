// CategoryPickerModal — scrollable modal picker with search
import { useState } from 'react'
import {
  View, Text, TouchableOpacity, Modal, TextInput,
  ScrollView, StyleSheet,
} from 'react-native'
import { X, Search, Check } from 'lucide-react-native'
import type { Category } from '../../lib/types'

interface Props {
  visible: boolean
  onClose: () => void
  categories: Category[]
  selectedId?: string
  onSelect: (cat: Category) => void
  onAddNew: () => void
}

export function CategoryPickerModal({
  visible, onClose, categories, selectedId, onSelect, onAddNew,
}: Props) {
  const [search, setSearch] = useState('')
  const filtered = categories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  function handleSelect(cat: Category) {
    onSelect(cat)
    onClose()
    setSearch('')
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Select Category</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchRow}>
            <Search size={16} color="#94a3b8" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search categories..."
              placeholderTextColor="#94a3b8"
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
            />
          </View>

          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {filtered.length === 0 ? (
              <Text style={styles.empty}>No categories found</Text>
            ) : (
              filtered.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.item,
                    selectedId === cat.id && { backgroundColor: cat.color + '20' },
                  ]}
                  onPress={() => handleSelect(cat)}
                >
                  <View style={[styles.colorDot, { backgroundColor: cat.color }]} />
                  <Text style={styles.itemText}>{cat.name}</Text>
                  {selectedId === cat.id && (
                    <Check size={16} color={cat.color} style={styles.checkIcon} />
                  )}
                </TouchableOpacity>
              ))
            )}
          </ScrollView>

          <TouchableOpacity style={styles.addBtn} onPress={() => { onAddNew(); onClose() }}>
            <Text style={styles.addBtnText}>+ Add New Category</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', padding: 20,
  },
  sheet: {
    backgroundColor: '#fff', borderRadius: 16, maxHeight: '80%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  title: { fontSize: 17, fontWeight: '800', color: '#0f172a' },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center',
  },
  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    margin: 12, paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: '#f8fafc', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0',
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#0f172a' },
  list: { maxHeight: 300, paddingHorizontal: 12 },
  empty: {
    textAlign: 'center', color: '#94a3b8', fontSize: 14,
    paddingVertical: 20,
  },
  item: {
    flexDirection: 'row', alignItems: 'center',
    padding: 12, borderRadius: 10, marginBottom: 4,
  },
  colorDot: { width: 12, height: 12, borderRadius: 6, marginRight: 10 },
  itemText: { flex: 1, fontSize: 15, color: '#0f172a', fontWeight: '500' },
  checkIcon: { marginLeft: 8 },
  addBtn: {
    margin: 12, padding: 14, borderRadius: 10,
    backgroundColor: '#f97316', alignItems: 'center',
  },
  addBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
})
