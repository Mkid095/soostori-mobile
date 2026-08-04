// Step 4: Barcode
import { View, Text, TextInput, TouchableOpacity } from 'react-native'
import { Camera, RefreshCw } from 'lucide-react-native'

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

      <TouchableOpacity
        style={{
          backgroundColor: c.brand, borderRadius: 12, paddingVertical: 16,
          alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8,
        }}
        onPress={onGenerate}
      >
        <RefreshCw size={20} color="#fff" />
        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Generate Barcode</Text>
      </TouchableOpacity>

      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
        <TextInput
          style={{ ...inputStyle(c), flex: 1 }}
          placeholder="Or enter barcode manually"
          placeholderTextColor={c.textSecondary}
          value={(form.barcode as string) || ''}
          onChangeText={(v) => set('barcode', v)}
        />
        <TouchableOpacity
          style={{ width: 52, height: 52, borderRadius: 12, backgroundColor: c.card, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: c.border }}
          onPress={onScan}
        >
          <Camera size={24} color={c.brand} />
        </TouchableOpacity>
      </View>

      {!!form.barcode && (
        <View style={{ backgroundColor: c.card, borderRadius: 12, padding: 14, borderWidth: 2, borderColor: c.success }}>
          <Text style={{ color: c.success, fontSize: 13, fontWeight: '700' }}>
            {isEdit ? 'Barcode:' : 'Generated:'} {String(form.barcode)}
          </Text>
        </View>
      )}
    </View>
  )
}
