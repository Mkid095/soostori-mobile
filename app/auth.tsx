// app/auth.tsx — PIN login screen with optional biometric
import React, { useState, useCallback, useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions, Platform } from 'react-native'
import { router } from 'expo-router'
import * as LocalAuthentication from 'expo-local-authentication'
import { useTheme } from '../src/hooks/useTheme'
import { getShopSettings } from '../src/services/db-settings'

const PIN_LENGTH = 4
const DEFAULT_PIN = '0000'

type BiometricStatus = 'unavailable' | 'not_enrolled' | 'ready' | 'enabled'

export default function AuthScreen() {
  const theme = useTheme()
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [shakeAnim] = useState(() => new Animated.Value(0))
  const [biometricStatus, setBiometricStatus] = useState<BiometricStatus>('unavailable')
  const [biometricReason, setBiometricReason] = useState('')

  useEffect(() => {
    checkBiometric()
  }, [])

  const checkBiometric = async () => {
    const settings = await getShopSettings()
    if (!settings?.biometricEnabled) {
      setBiometricStatus('enabled') // show icon but disabled until user enables in settings
      return
    }

    const compat = await LocalAuthentication.hasHardwareAsync()
    if (!compat) { setBiometricStatus('unavailable'); return }

    const enrolled = await LocalAuthentication.isEnrolledAsync()
    if (!enrolled) { setBiometricStatus('not_enrolled'); return }

    setBiometricStatus('ready')
  }

  const handleBiometricAuth = async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Authenticate to access Soostori POS',
      cancelLabel: 'Use PIN',
      fallbackLabel: 'Use PIN',
    })

    if (result.success) {
      router.replace('/(tabs)/pos')
    } else {
      setBiometricReason(result.error || 'Authentication failed')
      setTimeout(() => setBiometricReason(''), 3000)
    }
  }

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
        <View
          key={i}
          style={[
            styles.dot,
            {
              backgroundColor: i < pin.length ? theme.brand : 'transparent',
              borderColor: i < pin.length ? theme.brand : theme.muted,
            },
          ]}
        />
      ))}
    </Animated.View>
  )

  const canUseBiometric = biometricStatus === 'ready'

  const renderKeypad = () => {
    const rows = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['', '0', 'delete'],
    ]
    return (
      <View style={styles.keypad}>
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.keypadRow}>
            {row.map((key, keyIndex) => {
              if (key === '') {
                const iconColor = canUseBiometric ? theme.brand : theme.muted
                return (
                  <TouchableOpacity
                    key="biometric"
                    style={[styles.keypadButton, { backgroundColor: theme.card }]}
                    onPress={canUseBiometric ? handleBiometricAuth : undefined}
                    disabled={!canUseBiometric}
                    accessibilityLabel="Fingerprint"
                  >
                    <Text style={[styles.fingerprintIcon, { color: iconColor }]}>
                      {'\u{1F91A}'}
                    </Text>
                  </TouchableOpacity>
                )
              }
              if (key === 'delete') {
                return (
                  <TouchableOpacity
                    key="delete"
                    style={[styles.keypadButton, { backgroundColor: theme.card }]}
                    onPress={handleDelete}
                    accessibilityLabel="Delete"
                  >
                    <Text style={[styles.deleteText, { color: theme.text }]}>DEL</Text>
                  </TouchableOpacity>
                )
              }
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.keypadButton, { backgroundColor: theme.card }]}
                  onPress={() => handleDigit(key)}
                  accessibilityLabel={key}
                >
                  <Text style={[styles.keyText, { color: theme.text }]}>{key}</Text>
                </TouchableOpacity>
              )
            })}
          </View>
        ))}
      </View>
    )
  }

  const biometricHintText = () => {
    switch (biometricStatus) {
      case 'unavailable': return 'Biometric not available on this device'
      case 'not_enrolled': return 'No fingerprint/face enrolled — set up in device settings'
      case 'enabled': return 'Enable biometric in Settings to use this'
      case 'ready': return 'Tap fingerprint to login'
      default: return ''
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={styles.content}>
        <View style={[styles.logoContainer, { backgroundColor: theme.brand }]}>
          <Text style={styles.logoText}>S</Text>
        </View>
        <Text style={[styles.title, { color: theme.text }]}>Enter PIN</Text>
        {renderDots()}
        {error ? (
          <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>
        ) : (
          <Text style={[styles.errorText, { color: 'transparent' }]}>error</Text>
        )}
        {biometricReason ? (
          <Text style={[styles.errorText, { color: theme.danger }]}>{biometricReason}</Text>
        ) : null}
        {renderKeypad()}
        <Text style={[styles.hintText, { color: theme.textSecondary }]}>
          {biometricHintText()}
        </Text>
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
  logoContainer: {
    width: 72,
    height: 72,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  logoText: { fontSize: 36, fontWeight: '700', color: '#fff' },
  title: { fontSize: 22, fontWeight: '600', marginBottom: 24 },
  dotsContainer: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    borderWidth: 2,
  },
  errorText: { fontSize: 13, height: 18, marginBottom: 16 },
  keypad: { marginTop: 8, gap: 12 },
  keypadRow: { flexDirection: 'row', gap: 12 },
  keypadButton: {
    width: KEYPAD_BUTTON_SIZE,
    height: KEYPAD_BUTTON_SIZE,
    borderRadius: KEYPAD_BUTTON_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: { elevation: 2 },
    }),
  },
  keyText: { fontSize: 28, fontWeight: '500' },
  fingerprintIcon: { fontSize: 28 },
  deleteText: { fontSize: 14, fontWeight: '600' },
  hintText: { fontSize: 11, marginTop: 16, textAlign: 'center' },
})
