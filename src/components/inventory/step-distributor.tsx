// Step 4: Distributor info
import { View, Text, TextInput } from 'react-native'
import { Info } from 'lucide-react-native'

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
    <View style={{ gap: 14 }}>
      <View style={{ gap: 4 }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: c.text }}>
          Distributor Information
        </Text>
        <Text style={{ fontSize: 13, color: c.textSecondary, lineHeight: 18 }}>
          Optional supplier contact for restocking notifications
        </Text>
      </View>

      {/* Info notice */}
      <View style={{
        backgroundColor: c.card,
        borderRadius: 10,
        padding: 12,
        borderWidth: 1,
        borderColor: c.border,
        flexDirection: 'row',
        gap: 10,
        alignItems: 'flex-start',
      }}>
    // @ts-expect-error
        <Info size={18} color={c.textSecondary} style={{ marginTop: 1 }} />
        <Text style={{ fontSize: 13, color: c.textSecondary, flex: 1, lineHeight: 18 }}>
          Used for restocking notifications and supplier contact
        </Text>
      </View>

      <View style={{ gap: 12 }}>
        <View>
          <Text style={{ fontSize: 13, fontWeight: '600', color: c.text, marginBottom: 8 }}>
            Distributor Name
          </Text>
          <TextInput
            style={inputStyle(c)}
            placeholder="Supplier or wholesaler name"
            placeholderTextColor={c.textSecondary}
            value={(form.distributorName as string) || ''}
            onChangeText={(v) => set('distributorName', v)}
          />
        </View>
        <View>
          <Text style={{ fontSize: 13, fontWeight: '600', color: c.text, marginBottom: 8 }}>
            Distributor Phone
          </Text>
          <TextInput
            style={inputStyle(c)}
            placeholder="+254 700 000 000"
            placeholderTextColor={c.textSecondary}
            value={(form.distributorPhone as string) || ''}
            onChangeText={(v) => set('distributorPhone', v)}
            keyboardType="phone-pad"
          />
        </View>
      </View>
    </View>
  )
}
