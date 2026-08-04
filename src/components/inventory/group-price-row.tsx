// GroupPriceRow — tier row for group pricing
import { View, TextInput, TouchableOpacity } from 'react-native'
import { X } from 'lucide-react-native'

interface Props {
  gp: { name: string; price: string; minQuantity: string }
  index: number
  c: Record<string, string>
  onUpdate: (i: number, f: 'minQuantity' | 'price', v: string) => void
  onRemove: (i: number) => void
}

function inputStyle(c: Record<string, string>) {
  return {
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, borderWidth: 1,
    backgroundColor: c.card, color: c.text, borderColor: c.border,
  }
}

export function GroupPriceRow({ gp, index, c, onUpdate, onRemove }: Props) {
  return (
    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'center' }}>
      <TextInput
        style={{ ...inputStyle(c), flex: 1 }}
        placeholder="Min Qty"
        placeholderTextColor={c.textSecondary}
        value={gp.minQuantity}
        onChangeText={(v) => onUpdate(index, 'minQuantity', v)}
        keyboardType="number-pad"
      />
      <TextInput
        style={{ ...inputStyle(c), flex: 1 }}
        placeholder="Price"
        placeholderTextColor={c.textSecondary}
        value={gp.price}
        onChangeText={(v) => onUpdate(index, 'price', v)}
        keyboardType="decimal-pad"
      />
      <TouchableOpacity
        onPress={() => onRemove(index)}
        style={{
          width: 44, height: 44, borderRadius: 10,
          backgroundColor: c.danger, justifyContent: 'center', alignItems: 'center',
        }}
      >
        <X size={16} color="#fff" />
      </TouchableOpacity>
    </View>
  )
}
