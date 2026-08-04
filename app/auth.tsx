// app/auth.tsx — PIN login screen
import React, { useState, useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions, Platform } from 'react-native'
import { router } from 'expo-router'
import { useTheme } from '../src/hooks/useTheme'

const PIN_LENGTH = 4
const DEFAULT_PIN = '0000'

export default function AuthScreen() {
  const theme = useTheme()
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [shakeAnim] = useState(() => new Animated.Value(0))

  const shake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start()
  }, [shakeAnim])

  const handleDigit = useCallback((digit: string) => {
    if (pin.length >= PIN_LENGTH) return
    const newPin = pin + digit
    setPin(newPin)
    setError('')
    if (newPin.length === PIN_LENGTH) {
      if (newPin === DEFAULT_PIN) {
        router.replace('/(tabs)/pos')
      } else {
        shake()
        setError('Incorrect PIN')
        setPin('')
      }
    }
  }, [pin, shake])

  const handleDelete = useCallback(() => {
    setPin((p) => p.slice(0, -1))
    setError('')
  }, [])

  const renderDots = () => (
    <Animated.View style={[styles.dotsContainer, { transform: [{ translateX: shakeAnim }] }]}>
      {Array.from({ length: PIN_LENGTH }).map((_, i) => (
        <View key={i} style={[styles.dot, { backgroundColor: i < pin.length ? theme.brand : 'transparent', borderColor: i < pin.length ? theme.brand : theme.muted }]} />
      ))}
    </Animated.View>
  )

  const renderKeypad = () => {
    const rows = [['1','2','3'], ['4','5','6'], ['7','8','9'], ['fingerprint','0','delete']]
    return (
      <View style={styles.keypad}>
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.keypadRow}>
            {row.map((key) => {
              if (key === 'fingerprint') {
                return <TouchableOpacity key="fingerprint" style={[styles.keypadButton, { backgroundColor: theme.card }]} onPress={() => {}} accessibilityLabel="Fingerprint"><Text style={[styles.fingerprintIcon, { color: theme.brand }]}>{'\u{1F91A}'}</Text></TouchableOpacity>
              }
              if (key === 'delete') {
                return <TouchableOpacity key="delete" style={[styles.keypadButton, { backgroundColor: theme.card }]} onPress={handleDelete} accessibilityLabel="Delete"><Text style={[styles.deleteText, { color: theme.text }]}>DEL</Text></TouchableOpacity>
              }
              return <TouchableOpacity key={key} style={[styles.keypadButton, { backgroundColor: theme.card }]} onPress={() => handleDigit(key)} accessibilityLabel={key}><Text style={[styles.keyText, { color: theme.text }]}>{key}</Text></TouchableOpacity>
            })}
          </View>
        ))}
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={styles.content}>
        <View style={[styles.logoContainer, { backgroundColor: theme.brand }]}><Text style={styles.logoText}>S</Text></View>
        <Text style={[styles.title, { color: theme.text }]}>Enter PIN</Text>
        {renderDots()}
        {error ? <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text> : <Text style={[styles.errorText, { color: 'transparent' }]}>error</Text>}
        {renderKeypad()}
      </View>
    </View>
  )
}

const { width } = Dimensions.get('window')
const DOT_SIZE = 16
const KEYPAD_BUTTON_SIZE = width * 0.2

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { alignItems: 'center', width: '100%', paddingHorizontal: 40 },
  logoContainer: { width: 72, height: 72, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 32 },
  logoText: { fontSize: 36, fontWeight: '700', color: '#fff' },
  title: { fontSize: 22, fontWeight: '600', marginBottom: 24 },
  dotsContainer: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  dot: { width: DOT_SIZE, height: DOT_SIZE, borderRadius: DOT_SIZE / 2, borderWidth: 2 },
  errorText: { fontSize: 13, height: 18, marginBottom: 16 },
  keypad: { marginTop: 8, gap: 12 },
  keypadRow: { flexDirection: 'row', gap: 12 },
  keypadButton: { width: KEYPAD_BUTTON_SIZE, height: KEYPAD_BUTTON_SIZE, borderRadius: KEYPAD_BUTTON_SIZE / 2, justifyContent: 'center', alignItems: 'center', ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 }, android: { elevation: 2 } }) },
  keyText: { fontSize: 28, fontWeight: '500' },
  fingerprintIcon: { fontSize: 28 },
  deleteText: { fontSize: 14, fontWeight: '600' },
})