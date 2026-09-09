// AppearanceModalContent — theme toggle in modal context
import { View, Text, TouchableOpacity } from 'react-native'
import { Sun, Moon } from 'lucide-react-native'
import { useTheme, useAppTheme } from '../../hooks/useTheme'

export function AppearanceModalContent() {
  const { effectiveScheme, toggleScheme } = useAppTheme()
  const { text, textSecondary, border, card: cardBg, brand } = useTheme()

  return (
    <View style={{ gap: 20 }}>
      <View>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <Sun size={16} color={brand} style={{ marginRight: 6 }} />
          <Text style={{ fontSize: 13, fontWeight: '700', color: text }}>Default Theme</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity
            onPress={() => effectiveScheme === 'dark' && toggleScheme()}
            style={{
              flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5,
              borderColor: effectiveScheme === 'light' ? brand : border,
              backgroundColor: effectiveScheme === 'light' ? cardBg : 'transparent',
              alignItems: 'center',
            }}
          >
            <Sun size={16} color={effectiveScheme === 'light' ? brand : textSecondary} />
            <Text style={{ fontSize: 12, fontWeight: '600', color: effectiveScheme === 'light' ? brand : textSecondary, marginTop: 4 }}>Light</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => effectiveScheme === 'light' && toggleScheme()}
            style={{
              flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5,
              borderColor: effectiveScheme === 'dark' ? brand : border,
              backgroundColor: effectiveScheme === 'dark' ? cardBg : 'transparent',
              alignItems: 'center',
            }}
          >
            <Moon size={16} color={effectiveScheme === 'dark' ? brand : textSecondary} />
            <Text style={{ fontSize: 12, fontWeight: '600', color: effectiveScheme === 'dark' ? brand : textSecondary, marginTop: 4 }}>Dark</Text>
          </TouchableOpacity>
        </View>
        <Text style={{ fontSize: 11, color: textSecondary, marginTop: 8 }}>Applied to all screens when app starts</Text>
      </View>
    </View>
  )
}
