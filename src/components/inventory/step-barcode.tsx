// Step 4: Barcode
import { View, Text, TextInput, TouchableOpacity } from 'react-native'
import { Camera } from 'lucide-react-native'

interface Props {
  form: Record<string, unknown>
  set: (k: string, v: unknown) => void
  c: Record<string, string>
  onScan: () => void
  onGenerate: () => void
  isEdit: boolean
}

function inputStyle(c: Record<string, string>) {
  return {
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, borderWidth: 1,
    backgroundColor: c.card, color: c.text, borderColor: c.border,
  }
}

export function renderBarcodeStep({ form, set, c, onScan, onGenerate, isEdit }: Props) {
  return (
    <View style={{ gap: 16 }}>
      <Text style={{ fontSize: 15, fontWeight: '700', color: c.text, marginBottom: 4 }}>
        Barcode (Optional)
      </Text>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
        <TextInput
          style={{ ...inputStyle(c), flex: 1 }}
          placeholder="Enter or scan barcode"
          placeholderTextColor={c.textSecondary}
          value={(form.barcode as string) || ''}
          onChangeText={(v) => set('barcode', v)}
        />
        <TouchableOpacity
          style={{ width: 48, height: 48, borderRadius: 10, backgroundColor: c.brand, justifyContent: 'center', alignItems: 'center' }}
          onPress={onScan}
        >
          <Camera size={22} color="#fff" />
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        style={{ backgroundColor: c.card, borderRadius: 10, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: c.border }}
        onPress={onGenerate}
      >
        <Text style={{ color: c.brand, fontWeight: '700', fontSize: 14 }}>Generate Barcode</Text>
      </TouchableOpacity>
      {!!form.barcode && (
        <View style={{ backgroundColor: c.card, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: c.success }}>
          <Text style={{ color: c.success, fontSize: 13, fontWeight: '700' }}>
            {isEdit ? 'Barcode:' : 'Generated:'} {String(form.barcode)}
          </Text>
        </View>
      )}
    </View>
  )
}
