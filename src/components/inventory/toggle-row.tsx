// ToggleRow — checkbox-style toggle for form settings
import { View, Text, TouchableOpacity } from 'react-native'

interface Props {
  label: string
  checked: boolean
  onToggle: () => void
  c: Record<string, string>
}

export function ToggleRow({ label, checked, onToggle, c }: Props) {
  return (
    <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }} onPress={onToggle}>
      <View style={{
        width: 22, height: 22, borderRadius: 6,
        backgroundColor: checked ? c.brand : c.card,
        borderWidth: 1, borderColor: checked ? c.brand : c.border,
        justifyContent: 'center', alignItems: 'center',
      }}>
        {checked && <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: '#fff' }} />}
      </View>
      <Text style={{ color: c.text, fontSize: 14 }}>{label}</Text>
    </TouchableOpacity>
  )
}
