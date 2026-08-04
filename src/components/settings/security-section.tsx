// SecuritySection — biometric auth toggle in settings
// Pure presentation: no business logic, no API calls.

import { View, Text, Switch, Alert } from 'react-native'
import { useTheme } from '../../hooks/useTheme'

interface Props {
  biometricEnabled: boolean
  biometricStatus: string
  onToggle: (val: boolean) => void
}

export function SecuritySection({ biometricEnabled, biometricStatus, onToggle }: Props) {
  const { card, text, textSecondary: textMuted, border, isDark, brand: orange } = useTheme()

  return (
    <View style={{ backgroundColor: card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: border }}>
      <Text style={{ fontSize: 15, fontWeight: '800', color: text, marginBottom: 14 }}>Security</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, color: text, fontWeight: '600' }}>Biometric Authentication</Text>
          <Text style={{ fontSize: 12, color: textMuted, marginTop: 2 }}>Status: {biometricStatus}</Text>
        </View>
        <Switch
          value={biometricEnabled}
          onValueChange={(val) => {
            if (val && biometricStatus !== 'Ready') {
              Alert.alert('Unavailable', 'Please enroll fingerprint/face in device settings first.')
              return
            }
            onToggle(val)
          }}
          trackColor={{ false: isDark ? '#334155' : '#e2e8f0', true: orange }}
          thumbColor="#fff"
          disabled={biometricStatus !== 'Ready'}
        />
      </View>
      <Text style={{ fontSize: 11, color: textMuted, marginTop: 8 }}>
        Use fingerprint or face recognition to unlock the app
      </Text>
    </View>
  )
}
