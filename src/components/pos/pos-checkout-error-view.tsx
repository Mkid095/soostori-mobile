// Sale rejected error view
import { View, Text, TouchableOpacity } from 'react-native'

interface Props {
  errorMsg: string
  onRetry: () => void
  brand: string
  text: string
  muted: string
}

export function SaleRejectedView({ errorMsg, onRetry, brand, text, muted }: Props) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 20 }}>
      <Text style={{ fontSize: 40 }}>X</Text>
      <Text style={{ fontSize: 18, fontWeight: '800', color: text }}>Sale Rejected</Text>
      <Text style={{ fontSize: 14, color: muted, textAlign: 'center' }}>{errorMsg}</Text>
      <TouchableOpacity style={{ backgroundColor: brand, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12 }} onPress={onRetry}>
        <Text style={{ color: '#fff', fontWeight: '700' }}>Try Again</Text>
      </TouchableOpacity>
    </View>
  )
}
