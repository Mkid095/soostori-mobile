// AppearanceSection — dark mode toggle
// Pure presentation: no business logic.

import { View, Text, Switch } from 'react-native'
import { useTheme } from '../../hooks/useTheme'

interface Props {
  isDark: boolean
  effectiveScheme: string
  onToggle: () => void
  orange: string
}

export function AppearanceSection({ isDark, effectiveScheme, onToggle, orange }: Props) {
  const { card, text, textSecondary: textMuted, border } = useTheme()
  return (
    <View style={{ backgroundColor: card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: border }}>
      <Text style={{ fontSize: 15, fontWeight: '800', color: text, marginBottom: 14 }}>Appearance</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View>
          <Text style={{ fontSize: 14, color: text, fontWeight: '600' }}>Dark Mode</Text>
          <Text style={{ fontSize: 12, color: textMuted, marginTop: 2 }}>Currently: {effectiveScheme === 'dark' ? 'Dark' : 'Light'}</Text>
        </View>
        <Switch
          value={effectiveScheme === 'dark'}
          onValueChange={onToggle}
          trackColor={{ false: isDark ? '#334155' : '#e2e8f0', true: orange }}
          thumbColor="#fff"
        />
      </View>
    </View>
  )
}
