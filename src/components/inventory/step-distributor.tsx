// Step 3: Distributor info
import { View, Text, TextInput } from 'react-native'

interface Props {
  form: Record<string, unknown>
  set: (k: string, v: unknown) => void
  c: Record<string, string>
}

function inputStyle(c: Record<string, string>) {
  return {
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, borderWidth: 1,
    backgroundColor: c.card, color: c.text, borderColor: c.border,
  }
}

export function renderDistributorStep({ form, set, c }: Props) {
  return (
    <View style={{ gap: 16 }}>
      <Text style={{ fontSize: 15, fontWeight: '700', color: c.text, marginBottom: 4 }}>
        Distributor Info (Optional)
      </Text>
      <View>
        <Text style={{ fontSize: 13, fontWeight: '700', color: c.text, marginBottom: 6 }}>Distributor Name</Text>
        <TextInput
          style={inputStyle(c)}
          placeholder="e.g. Kenya Traders Ltd"
          placeholderTextColor={c.textSecondary}
          value={(form.distributorName as string) || ''}
          onChangeText={(v) => set('distributorName', v)}
        />
      </View>
      <View>
        <Text style={{ fontSize: 13, fontWeight: '700', color: c.text, marginBottom: 6 }}>Distributor Phone</Text>
        <TextInput
          style={inputStyle(c)}
          placeholder="e.g. 0712 345 678"
          placeholderTextColor={c.textSecondary}
          value={(form.distributorPhone as string) || ''}
          onChangeText={(v) => set('distributorPhone', v)}
          keyboardType="phone-pad"
        />
      </View>
    </View>
  )
}
