// Step 4: Barcode
import { View, Text, TextInput, TouchableOpacity } from 'react-native'
import { Camera } from 'lucide-react-native'

const baseInput = { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, borderWidth: 1 }

interface Props {
  form: Record<string, any>
  set: (k: string, v: any) => void
  c: any
  onScan: () => void
  onGenerate: () => void
  isEdit: boolean
}

export function renderBarcodeStep({ form, set, c, onScan, onGenerate, isEdit }: Props) {
  return (
    <View style={{ gap: 14 }}>
      <Text style={{ fontSize: 15, fontWeight: '700', color: c.text, marginBottom: 4 }}>
        Barcode (Optional)
      </Text>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <TextInput
          style={{ ...baseInput, flex: 1, backgroundColor: c.card, color: c.text, borderColor: c.border }}
          placeholder="Enter or scan barcode"
          placeholderTextColor={c.textSecondary}
          value={form.barcode || ''}
          onChangeText={(v) => set('barcode', v)}
        />
        <TouchableOpacity
          style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: c.brand, justifyContent: 'center', alignItems: 'center' }}
          onPress={onScan}
        >
          <Camera size={20} color="#fff" />
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        style={{ backgroundColor: c.card, borderRadius: 10, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: c.border }}
        onPress={onGenerate}
      >
        <Text style={{ color: c.brand, fontWeight: '700', fontSize: 14 }}>Generate Barcode</Text>
      </TouchableOpacity>
      {form.barcode && (
        <View style={{ backgroundColor: c.card, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: c.success }}>
          <Text style={{ color: c.success, fontSize: 13, fontWeight: '700' }}>
            {isEdit ? 'Barcode:' : 'Generated:'} {form.barcode}
          </Text>
        </View>
      )}
    </View>
  )
}
