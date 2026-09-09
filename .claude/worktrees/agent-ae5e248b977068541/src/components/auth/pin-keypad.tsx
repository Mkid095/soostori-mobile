// PinKeypad — numeric keypad with biometric button
// Pure presentation: no business logic, no API calls.

import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Platform, Dimensions } from 'react-native'
import { Fingerprint, Delete } from 'lucide-react-native'
import { radius } from '../../lib/theme'

interface Props {
  onDigit: (digit: string) => void
  onDelete: () => void
  onBiometric?: () => void
  biometricEnabled: boolean
  cardBg: string
  textColor: string
  brandColor: string
  mutedColor: string
}

export function PinKeypad({ onDigit, onDelete, onBiometric, biometricEnabled, cardBg, textColor, brandColor, mutedColor }: Props) {
  const { width } = Dimensions.get('window')
  const BUTTON_SIZE = Math.floor(width * 0.2)
  const rows = [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['', '0', 'delete']]

  return (
    <View style={styles.keypad}>
      {rows.map((row, ri) => (
        <View key={ri} style={styles.row}>
          {row.map((key) => {
            if (key === '') {
              const iconColor = biometricEnabled ? brandColor : mutedColor
              return (
                <TouchableOpacity
                  key="bio"
                  style={[styles.button, { backgroundColor: cardBg, width: BUTTON_SIZE, height: BUTTON_SIZE }]}
                  onPress={biometricEnabled ? onBiometric : undefined}
                  disabled={!biometricEnabled}
                  accessibilityLabel="Fingerprint"
                  activeOpacity={0.7}
                >
                  <Fingerprint size={28} color={iconColor} />
                </TouchableOpacity>
              )
            }
            if (key === 'delete') {
              return (
                <TouchableOpacity
                  key="del"
                  style={[styles.button, { backgroundColor: cardBg, width: BUTTON_SIZE, height: BUTTON_SIZE }]}
                  onPress={onDelete}
                  accessibilityLabel="Delete"
                  activeOpacity={0.7}
                >
                  <Delete size={22} color={textColor} />
                </TouchableOpacity>
              )
            }
            return (
              <TouchableOpacity
                key={key}
                style={[styles.button, { backgroundColor: cardBg, width: BUTTON_SIZE, height: BUTTON_SIZE }]}
                onPress={() => onDigit(key)}
                accessibilityLabel={key}
                activeOpacity={0.6}
              >
                <Text style={[styles.keyText, { color: textColor }]}>{key}</Text>
              </TouchableOpacity>
            )
          })}
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  keypad: { marginTop: 8, gap: 14 },
  row: { flexDirection: 'row', gap: 14 },
  button: {
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4 },
      android: { elevation: 3 },
    }),
  },
  keyText: { fontSize: 26, fontWeight: '500', fontVariant: ['tabular-nums'] },
})
