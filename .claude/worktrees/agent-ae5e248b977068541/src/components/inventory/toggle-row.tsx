// ToggleRow — checkbox-style toggle for form settings with optional info hint
import { View, Text, TouchableOpacity, Alert } from 'react-native'
import { Info } from 'lucide-react-native'

interface Props {
  label: string
  checked: boolean
  onToggle: () => void
  c: Record<string, string>
  hint?: string   // "For more information" text shown in an alert when the (i) icon is pressed
}

export function ToggleRow({ label, checked, onToggle, c, hint }: Props) {
  function showHint() {
    Alert.alert(label, hint || '')
  }

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <TouchableOpacity style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }} onPress={onToggle}>
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
      {hint && (
        <TouchableOpacity onPress={showHint} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Info size={16} color={c.textSecondary as string} />
        </TouchableOpacity>
      )}
    </View>
  )
}
