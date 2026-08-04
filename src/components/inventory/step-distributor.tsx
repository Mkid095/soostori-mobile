// Step 3: Distributor info
import { View, Text, TextInput } from 'react-native'

interface Props {
  form: Record<string, any>
  set: (k: string, v: any) => void
  c: any
}

export function renderDistributorStep({ form, set, c }: Props) {
  const inputStyle = {
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 15, borderWidth: 1,
    backgroundColor: c.card, color: c.text, borderColor: c.border,
  }

  return (
    <View style={{ gap: 12 }}>
      <Text style={{ fontSize: 15, fontWeight: '700', color: c.text, marginBottom: 4 }}>
        Distributor Info (Optional)
      </Text>
      <View>
        <Text style={{ fontSize: 13, fontWeight: '700', color: c.text, marginBottom: 6 }}>Distributor Name</Text>
        <TextInput
          style={inputStyle}
          placeholder="e.g. Kenya Traders Ltd"
          placeholderTextColor={c.textSecondary}
          value={form.distributorName || ''}
          onChangeText={(v) => set('distributorName', v)}
        />
      </View>
      <View>
        <Text style={{ fontSize: 13, fontWeight: '700', color: c.text, marginBottom: 6 }}>Distributor Phone</Text>
        <TextInput
          style={inputStyle}
          placeholder="e.g. 0712 345 678"
          placeholderTextColor={c.textSecondary}
          value={form.distributorPhone || ''}
          onChangeText={(v) => set('distributorPhone', v)}
          keyboardType="phone-pad"
        />
      </View>
    </View>
  )
}
