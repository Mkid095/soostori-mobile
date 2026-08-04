// UnitPickerModal — scrollable modal picker with search and custom entry
import { useState } from 'react'
import {
  View, Text, TouchableOpacity, Modal, TextInput,
  ScrollView,
} from 'react-native'
import { X, Search, Check } from 'lucide-react-native'
import { unitPickerStyles as s } from './unit-picker-styles'

const PRESET_UNITS = [
  'Piece', 'Kg', 'Gram', 'Liter', 'Milliliter', 'Box', 'Pack',
  'Carton', 'Meter', 'Dozen', 'Pair', 'Bundle', 'Sack',
  'Plate', 'Cup', 'Serving',
]

interface Props {
  visible: boolean
  onClose: () => void
  selectedUnit: string
  onSelect: (unit: string) => void
}

export function UnitPickerModal({
  visible, onClose, selectedUnit, onSelect,
}: Props) {
  const [search, setSearch] = useState('')
  const [showCustom, setShowCustom] = useState(false)
  const [customValue, setCustomValue] = useState('')

  const filtered = PRESET_UNITS.filter((u) =>
    u.toLowerCase().includes(search.toLowerCase())
  )

  function handleSelect(unit: string) {
    onSelect(unit.toLowerCase())
    onClose()
    setSearch('')
    setShowCustom(false)
    setCustomValue('')
  }

  function handleCustomCreate() {
    const trimmed = customValue.trim()
    if (!trimmed) return
    handleSelect(trimmed)
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={onClose}>
        <View style={s.sheet} onStartShouldSetResponder={() => true}>
          <View style={s.header}>
            <Text style={s.title}>Select Unit</Text>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}>
              <X size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <View style={s.searchRow}>
            <Search size={16} color="#94a3b8" style={s.searchIcon} />
            <TextInput
              style={s.searchInput}
              placeholder="Search units..."
              placeholderTextColor="#94a3b8"
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
            />
          </View>

          <ScrollView style={s.list} showsVerticalScrollIndicator={false}>
            {filtered.map((unit) => {
              const isSelected = selectedUnit.toLowerCase() === unit.toLowerCase()
              return (
                <TouchableOpacity
                  key={unit}
                  style={[s.item, isSelected && s.itemSelected]}
                  onPress={() => handleSelect(unit)}
                >
                  <Text style={[s.itemText, isSelected && s.itemTextSelected]}>
                    {unit}
                  </Text>
                  {isSelected && (
                    <View style={s.checkBadge}>
                      <Check size={14} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              )
            })}

            {showCustom ? (
              <View style={s.createRow}>
                <TextInput
                  style={s.createInput}
                  placeholder="Custom unit name"
                  placeholderTextColor="#94a3b8"
                  value={customValue}
                  onChangeText={setCustomValue}
                  autoFocus
                  autoCapitalize="words"
                />
                <TouchableOpacity style={s.createBtn} onPress={handleCustomCreate}>
                  <Text style={s.createBtnText}>Add</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={s.addBtn} onPress={() => setShowCustom(true)}>
                <Text style={s.addBtnText}>Custom Unit</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  )
}
