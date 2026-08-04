// PinKeypad — numeric keypad with biometric button
// Pure presentation: no business logic, no API calls.

import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Platform, Dimensions } from 'react-native'

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
  const BUTTON_SIZE = width * 0.2
  const rows = [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['', '0', 'delete']]

  return (
    <View style={styles.keypad}>
      {rows.map((row, ri) => (
        <View key={ri} style={styles.row}>
          {row.map((key, _ki) => {
            if (key === '') {
              const iconColor = biometricEnabled ? brandColor : mutedColor
              return (
                <TouchableOpacity
                  key="bio"
                  style={[styles.button, { backgroundColor: cardBg, width: BUTTON_SIZE, height: BUTTON_SIZE }]}
                  onPress={biometricEnabled ? onBiometric : undefined}
                  disabled={!biometricEnabled}
                  accessibilityLabel="Fingerprint"
                >
                  <Text style={[styles.icon, { color: iconColor }]}>{'\u{1F91A}'}</Text>
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
                >
                  <Text style={[styles.deleteText, { color: textColor }]}>DEL</Text>
                </TouchableOpacity>
              )
            }
            return (
              <TouchableOpacity
                key={key}
                style={[styles.button, { backgroundColor: cardBg, width: BUTTON_SIZE, height: BUTTON_SIZE }]}
                onPress={() => onDigit(key)}
                accessibilityLabel={key}
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
  keypad: { marginTop: 8, gap: 12 },
  row: { flexDirection: 'row', gap: 12 },
  button: {
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
      android: { elevation: 2 },
    }),
  },
  keyText: { fontSize: 28, fontWeight: '500' },
  icon: { fontSize: 28 },
  deleteText: { fontSize: 14, fontWeight: '600' },
})
