// AddCategoryDialog — themed modal for creating a new category
import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, Modal } from 'react-native'
import { X } from 'lucide-react-native'

const PRESET_COLORS = [
  '#F97316', '#EF4444', '#F59E0B', '#22C55E',
  '#3B82F6', '#8B5CF6', '#EC4899', '#06B6D4',
]

interface Props {
  visible: boolean
  onClose: () => void
  onCreated: (name: string, color: string) => void
  c: Record<string, string>
}

export function AddCategoryDialog({ visible, onClose, onCreated, c }: Props) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(PRESET_COLORS[0])

  function handleCreate() {
    if (!name.trim()) return
    onCreated(name.trim(), color)
    setName('')
    setColor(PRESET_COLORS[0])
    onClose()
  }

  function handleClose() {
    setName('')
    setColor(PRESET_COLORS[0])
    onClose()
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 }}
        activeOpacity={1}
        onPress={handleClose}
      >
        <View
          style={{ backgroundColor: c.card, borderRadius: 16, padding: 20 }}
          onStartShouldSetResponder={() => true}
        >
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: c.text }}>New Category</Text>
            <TouchableOpacity onPress={handleClose} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: c.bg, justifyContent: 'center', alignItems: 'center' }}>
              
              <X size={18} color={c.textSecondary as string} />
            </TouchableOpacity>
          </View>

          {/* Name Field */}
          <Text style={{ fontSize: 13, fontWeight: '600', color: c.text, marginBottom: 8 }}>Category Name</Text>
          <TextInput
            style={{
              borderWidth: 1, borderColor: c.border, borderRadius: 10,
              paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
              color: c.text, backgroundColor: c.bg, marginBottom: 20,
            }}
            placeholder="e.g. Beverages"
            placeholderTextColor={c.textSecondary}
            value={name}
            onChangeText={setName}
            autoFocus
          />

          {/* Color Picker */}
          <Text style={{ fontSize: 13, fontWeight: '600', color: c.text, marginBottom: 10 }}>Color</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
            {PRESET_COLORS.map((c_) => (
              <TouchableOpacity
                key={c_}
                onPress={() => setColor(c_)}
                style={{
                  width: 36, height: 36, borderRadius: 18,
                  backgroundColor: c_,
                  borderWidth: color === c_ ? 3 : 0,
                  borderColor: c.text,
                }}
              />
            ))}
          </View>

          {/* Actions */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              onPress={handleClose}
              style={{ flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: c.border, alignItems: 'center' }}
            >
              <Text style={{ color: c.text, fontWeight: '600', fontSize: 15 }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleCreate}
              style={{ flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: c.brand, alignItems: 'center' }}
            >
              <Text style={{ color: c.card, fontWeight: '700', fontSize: 15 }}>Create</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  )
}
