// Pending sale view — waiting for host confirmation
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

interface Props {
  onCancel: () => void
  bg: string
  card: string
  text: string
  textSecondary: string
  border: string
  brand: string
}

export function PendingSaleView({ onCancel, bg, card, text, textSecondary, border, brand }: Props) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 20 }}>
      <ActivityIndicator size="large" color={brand} />
      <Text style={{ fontSize: 18, fontWeight: '800', color: text }}>Waiting for approval…</Text>
      <Text style={{ fontSize: 14, color: textSecondary, textAlign: 'center' }}>Request sent to shop computer. Please wait.</Text>
      <TouchableOpacity
        style={{ backgroundColor: card, borderWidth: 1, borderColor: border, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10 }}
        onPress={onCancel}
      >
        <Text style={{ color: text, fontWeight: '600' }}>Cancel</Text>
      </TouchableOpacity>
    </View>
  )
}
