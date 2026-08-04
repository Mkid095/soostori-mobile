// CategoryPickerModal — scrollable modal picker with search and create
import { useState } from 'react'
import {
  View, Text, TouchableOpacity, Modal, TextInput,
  ScrollView,
} from 'react-native'
import { X, Search, Check, Plus } from 'lucide-react-native'
import type { Category } from '../../lib/types'
import { categoryPickerStyles as s } from './category-picker-styles'

interface Props {
  visible: boolean
  onClose: () => void
  categories: Category[]
  selectedId?: string
  onSelect: (cat: Category) => void
  onAddNew: (name: string) => void
}

export function CategoryPickerModal({
  visible, onClose, categories, selectedId, onSelect, onAddNew,
}: Props) {
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')

  const filtered = categories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  function handleSelect(cat: Category) {
    onSelect(cat)
    onClose()
    setSearch('')
  }

  function handleCreate() {
    if (!newName.trim()) return
    onAddNew(newName.trim())
    setNewName('')
    setShowCreate(false)
    onClose()
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={onClose}>
        <View style={s.sheet} onStartShouldSetResponder={() => true}>
          <View style={s.header}>
            <Text style={s.title}>Select Category</Text>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}>
              <X size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <View style={s.searchRow}>
            <Search size={16} color="#94a3b8" style={s.searchIcon} />
            <TextInput
              style={s.searchInput}
              placeholder="Search categories..."
              placeholderTextColor="#94a3b8"
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
            />
          </View>

          <ScrollView style={s.list} showsVerticalScrollIndicator={false}>
            {filtered.length === 0 && !showCreate ? (
              <Text style={s.empty}>No categories found</Text>
            ) : (
              filtered.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[s.item, selectedId === cat.id && s.itemSelected]}
                  onPress={() => handleSelect(cat)}
                >
                  <View style={[s.colorDot, { backgroundColor: cat.color }]} />
                  <Text style={[s.itemText, selectedId === cat.id && s.itemTextSelected]}>
                    {cat.name}
                  </Text>
                  {selectedId === cat.id && (
                    <View style={s.checkBadge}>
                      <Check size={14} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              ))
            )}

            {showCreate ? (
              <View style={s.createRow}>
                <TextInput
                  style={s.createInput}
                  placeholder="Category name"
                  placeholderTextColor="#94a3b8"
                  value={newName}
                  onChangeText={setNewName}
                  autoFocus
                />
                <TouchableOpacity style={s.createBtn} onPress={handleCreate}>
                  <Text style={s.createBtnText}>Add</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={s.addBtn} onPress={() => setShowCreate(true)}>
                <Plus size={16} color="#f97316" />
                <Text style={s.addBtnText}>Create New Category</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  )
}
