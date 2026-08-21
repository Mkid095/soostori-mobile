// app/auth.tsx — PIN login screen with optional biometric
import React, { useState, useCallback, useEffect } from 'react'
import { View, Text, StyleSheet, Animated, Platform } from 'react-native'
import { router } from 'expo-router'
import * as LocalAuthentication from 'expo-local-authentication'
import { Store } from 'lucide-react-native'
import { useTheme } from '../src/hooks/useTheme'
import { getShopSettings } from '../src/services/db-settings'
import { PinKeypad } from '../src/components/auth/pin-keypad'

const PIN_LENGTH = 4
const DEFAULT_PIN = '0000'

type BiometricStatus = 'unavailable' | 'not_enrolled' | 'ready' | 'enabled'

function getBiometricHint(status: BiometricStatus): string {
  switch (status) {
    case 'unavailable': return 'Biometric not available on this device'
    case 'not_enrolled': return 'No fingerprint or face enrolled — set up in device settings'
    case 'enabled': return 'Enable biometric in Settings to use this'
    case 'ready': return 'Tap fingerprint to sign in'
    default: return ''
  }
}

export default function AuthScreen() {
  const theme = useTheme()
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [shakeAnim] = useState(() => new Animated.Value(0))
  const [bioStatus, setBioStatus] = useState<BiometricStatus>('unavailable')
  const [bioReason, setBioReason] = useState('')

  useEffect(() => { checkBiometric() }, [])

  const checkBiometric = async () => {
    const settings = await getShopSettings()
    if (!settings?.biometricEnabled) { setBioStatus('enabled'); return }
    const hasHardware = await LocalAuthentication.hasHardwareAsync()
    if (!hasHardware) { setBioStatus('unavailable'); return }
    const enrolled = await LocalAuthentication.isEnrolledAsync()
    if (!enrolled) { setBioStatus('not_enrolled'); return }
    setBioStatus('ready')
  }

  const handleBiometric = async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Authenticate to access Soostori POS',
      cancelLabel: 'Use PIN',
      fallbackLabel: 'Use PIN',
    })
    if (result.success) {
      router.replace('/(tabs)/pos')
    } else {
      setBioReason(result.error || 'Authentication failed')
      setTimeout(() => setBioReason(''), 3000)
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

  const handleDelete = useCallback(() => { setPin((p) => p.slice(0, -1)); setError('') }, [])

  const dots = Array.from({ length: PIN_LENGTH }).map((_, i) => {
    const filled = i < pin.length
    return (
      <View
        key={i}
        style={[
          styles.dot,
          {
            backgroundColor: filled ? theme.brand : 'transparent',
            borderColor: filled ? theme.brand : theme.muted,
          },
        ]}
      />
    )
  })

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={styles.content}>
        {/* Logo mark */}
        <View style={[styles.logoMark, { backgroundColor: theme.brand }]}>
          <Store size={36} color="#fff" />
        </View>

        <Text style={[styles.title, { color: theme.text }]}>Enter PIN</Text>

        {/* PIN dots */}
        <Animated.View style={[styles.dotsContainer, { transform: [{ translateX: shakeAnim }] }]}>
          {dots}
        </Animated.View>

        {/* Error messages */}
        {error
          ? <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>
          : bioReason
            ? <Text style={[styles.errorText, { color: theme.danger }]}>{bioReason}</Text>
            : <View style={styles.errorSpacer} />
        }

        {/* Keypad */}
        <PinKeypad
          onDigit={handleDigit}
          onDelete={handleDelete}
          onBiometric={handleBiometric}
          biometricEnabled={bioStatus === 'ready'}
          cardBg={theme.card}
          textColor={theme.text}
          brandColor={theme.brand}
          mutedColor={theme.muted}
        />

        <Text style={[styles.hintText, { color: theme.textSecondary }]}>{getBiometricHint(bioStatus)}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { alignItems: 'center', width: '100%', paddingHorizontal: 40 },
  logoMark: {
    width: 72,
    height: 72,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
    ...Platform.select({
      ios: { shadowColor: '#F97316', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 12 },
      android: { elevation: 8 },
    }),
  },
  title: { fontSize: 22, fontWeight: '600', marginBottom: 28 },
  dotsContainer: { flexDirection: 'row', gap: 16, marginBottom: 8 },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
  errorText: { fontSize: 13, fontWeight: '500', marginBottom: 4, height: 18 },
  errorSpacer: { height: 18, marginBottom: 4 },
  hintText: { fontSize: 12, marginTop: 20, textAlign: 'center' },
})
