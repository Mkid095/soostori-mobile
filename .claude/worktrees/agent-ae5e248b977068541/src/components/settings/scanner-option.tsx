// ScannerOption — radio-style option row used in ScannerSection
import { View, Text, TouchableOpacity } from 'react-native'
import { useTheme } from '../../hooks/useTheme'

interface Props {
  title: string
  description: string
  active: boolean
  brand: string
  onPress: () => void
}

export function ScannerOption({ title, description, active, brand, onPress }: Props) {
  const { text, textSecondary: textMuted, border } = useTheme()
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{
        width: 20, height: 20, borderRadius: 10, borderWidth: 2,
        borderColor: active ? brand : border,
        backgroundColor: active ? brand : 'transparent',
        justifyContent: 'center', alignItems: 'center',
      }}>
        {active && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' }} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: text }}>{title}</Text>
        <Text style={{ fontSize: 12, color: textMuted, marginTop: 2 }}>{description}</Text>
      </View>
    </TouchableOpacity>
  )
}
