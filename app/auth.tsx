// app/auth.tsx — Employee login: magic code + PIN + OperationalAuth enrollment
import React, { useState, useCallback } from 'react'
import { View, Text, Animated, Platform, TouchableOpacity, ActivityIndicator, StyleSheet, Alert, TextInput } from 'react-native'
import { router } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SecureStore from 'expo-secure-store'
import { Store, ChevronDown, Mail } from 'lucide-react-native'
import { useTheme } from '../src/hooks/useTheme'
import { PinKeypad } from '../src/components/auth/pin-keypad'
import { PersonNotFoundScreen } from '../src/components/auth/person-not-found-screen'
import { JoinShopSheet } from '../src/components/shared/join-shop-sheet'
import { EmployeePickerModal } from '../src/components/auth/employee-picker-modal'
import { useAuthSdk } from '../src/hooks/useAuthSdk'
import { useAuthEmployees } from '../src/hooks/useAuthEmployees'
import { cloudSendMagicCode, cloudVerifyMagicCode } from '../src/services/cloud-auth-backend'

const PIN_LENGTH = 4
const CODE_LENGTH = 6
const EMPLOYEE_ID_KEY = '@soostori:employeeId'
const EMPLOYEE_ROLE_KEY = '@soostori:employeeRole'

type Step =
  | 'select'
  | 'magic_send'
  | 'magic_verify'
  | 'pin_verify'
  | 'pin_setup'
  | 'loading'
  | 'person_not_found'

export default function AuthScreen() {
  const theme = useTheme()
  const { employees, reload: reloadEmployees } = useAuthEmployees()
  const auth = useAuthSdk()

  const [selectedEmployee, setSelectedEmployee] = useState<import('../src/lib/sync-protocol').Employee | null>(null)
  const [showEmployeePicker, setShowEmployeePicker] = useState(false)
  const [pin, setPin] = useState('')
  const [code, setCode] = useState('')
  const [magicEmail, setMagicEmail] = useState('')
  const [error, setError] = useState('')
  const [shakeAnim] = useState(() => new Animated.Value(0))
  const [isLoading, setIsLoading] = useState(false)
  const [showJoinSheet, setShowJoinSheet] = useState(false)
  const [step, setStep] = useState<Step>('select')

  const shake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start()
  }, [shakeAnim])

  const navigateToPos = useCallback(async (employeeId: string, role: string) => {
    await AsyncStorage.setItem(EMPLOYEE_ID_KEY, employeeId)
    await AsyncStorage.setItem(EMPLOYEE_ROLE_KEY, role)
    router.replace('/(tabs)/pos')
  }, [])

  // ── PIN digit entry ─────────────────────────────────────────────────────────

  const handleDigit = useCallback(async (digit: string) => {
    if (pin.length >= PIN_LENGTH) return
    const newPin = pin + digit
    setPin(newPin)
    setError('')
    if (newPin.length === PIN_LENGTH) {
      setIsLoading(true)
      try {
        if (step === 'pin_setup') {
          const result = await auth.setupPin(newPin)
          if (result.ok) {
            await navigateToPos(auth.cloudUser?.id ?? selectedEmployee?.id ?? '', auth.cloudUser?.id ? 'owner' : (selectedEmployee?.role ?? 'attendant'))
          } else {
            shake(); setError(result.error?.message ?? 'PIN setup failed'); setPin('')
          }
        } else if (step === 'pin_verify') {
          const result = await auth.verifyPin(newPin)
          if (result.ok) {
            await navigateToPos(auth.cloudUser?.id ?? selectedEmployee?.id ?? '', auth.cloudUser?.id ? 'owner' : (selectedEmployee?.role ?? 'attendant'))
          } else {
            shake(); setError(result.error?.message ?? 'Incorrect PIN'); setPin('')
          }
        }
      } catch {
        shake(); setError('Validation failed'); setPin('')
      } finally {
        setIsLoading(false)
      }
    }
  }, [pin, step, auth, selectedEmployee, shake, navigateToPos])

  const handleDelete = useCallback(() => { setPin((p) => p.slice(0, -1)); setError('') }, [])

  // ── Magic code: send ────────────────────────────────────────────────────────

  const handleSendMagicCode = useCallback(async () => {
    const email = magicEmail.trim()
    if (!email || !email.includes('@')) {
      setError('Enter a valid email address')
      return
    }
    setIsLoading(true)
    setError('')
    try {
      await cloudSendMagicCode(email)
      setStep('magic_verify')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send code')
    } finally {
      setIsLoading(false)
    }
  }, [magicEmail])

  // ── Magic code: verify ─────────────────────────────────────────────────────

  const handleDigitCode = useCallback(async (digit: string) => {
    if (code.length >= CODE_LENGTH) return
    const newCode = code + digit
    setCode(newCode)
    setError('')
    if (newCode.length === CODE_LENGTH) {
      setIsLoading(true)
      try {
        const result = await cloudVerifyMagicCode(magicEmail.trim(), newCode)
        if (!result.ok) {
          if (result.code === 'PERSON_NOT_FOUND') {
            setStep('person_not_found')
            return
          }
          shake(); setError('Invalid or expired code'); setCode(''); return
        }

        const { response } = result
        // Set cloud session state from magic code result
        // auth.verifyMagicCode(...) would update auth state, but since we bypass
        // the SDK's cloud auth, we replicate the essential state here.
        // cloudToken MUST be in SecureStore (Keychain/Keystore) — never AsyncStorage.
        await SecureStore.setItemAsync('@soostori:cloudToken', response.user.id)
        await AsyncStorage.setItem('@soostori:shopId', response.shop.id)

        // Determine next step based on enrollmentState
        if (result.enrollmentState === 'new_device') {
          setStep('pin_setup')
        } else {
          setStep('pin_verify')
        }
      } catch (err) {
        shake(); setError(err instanceof Error ? err.message : 'Verification failed'); setCode('')
      } finally {
        setIsLoading(false)
      }
    }
  }, [code, magicEmail, shake])

  const handleDeleteCode = useCallback(() => { setCode((c) => c.slice(0, -1)); setError('') }, [])

  // ── Employee selected (existing local PIN login) ──────────────────────────────

  const handleEmployeeSelected = useCallback((emp: typeof selectedEmployee) => {
    setSelectedEmployee(emp)
    setShowEmployeePicker(false)
    setPin('')
    setStep('pin_verify')
  }, [])

  // ── Derived ──────────────────────────────────────────────────────────────────

  const pinDots = Array.from({ length: PIN_LENGTH }).map((_, i) => (
    <View key={i} style={[styles.dot, { backgroundColor: i < pin.length ? theme.brand : 'transparent', borderColor: i < pin.length ? theme.brand : theme.muted }]} />
  ))
  const codeDots = Array.from({ length: CODE_LENGTH }).map((_, i) => (
    <View key={i} style={[styles.dot, { backgroundColor: i < code.length ? theme.brand : 'transparent', borderColor: i < code.length ? theme.brand : theme.muted }]} />
  ))

  const showPinPad = step === 'pin_verify' || step === 'pin_setup'
  const title =
    step === 'pin_setup' ? 'Set Your PIN' :
    step === 'pin_verify' ? 'Enter PIN' :
    step === 'magic_send' ? 'Sign In' :
    step === 'magic_verify' ? 'Enter Code' : 'Sign In'

  // ── PERSON_NOT_FOUND screen ────────────────────────────────────────────────

  if (step === 'person_not_found') {
    return (
      <PersonNotFoundScreen
        email={magicEmail || null}
        onBack={() => { setStep('select'); setError('') }}
      />
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={styles.content}>
        <View style={[styles.logoMark, { backgroundColor: theme.brand }]}>
          <Store size={36} color="#fff" />
        </View>
        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>

        {/* Employee selector — returning employees with stored PIN */}
        {(step === 'select' || step === 'pin_verify') && employees.length > 0 && (
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, minWidth: 220, justifyContent: 'space-between', marginBottom: 24 }}
            onPress={() => setShowEmployeePicker(true)}
          >
            <Text style={{ fontSize: 15, color: selectedEmployee ? theme.text : theme.textSecondary, flex: 1 }}>
              {selectedEmployee ? selectedEmployee.name : 'Select employee'}
            </Text>
            <ChevronDown size={16} color={theme.textSecondary} />
          </TouchableOpacity>
        )}

        {/* Magic code: email entry */}
        {step === 'magic_send' && (
          <View style={{ width: '100%', marginBottom: 16 }}>
            <View style={[styles.emailInput, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Mail size={18} color={theme.textSecondary} style={{ marginRight: 10 }} />
              <TextInput
                style={[styles.emailTextInput, { color: theme.text }]}
                placeholder="your@email.com"
                placeholderTextColor={theme.textSecondary}
                value={magicEmail}
                onChangeText={setMagicEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: theme.brand, opacity: isLoading ? 0.6 : 1 }]}
              onPress={handleSendMagicCode}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Send Code</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Magic code: code entry dots */}
        {step === 'magic_verify' && (
          <>
            <Text style={{ color: theme.textSecondary, fontSize: 13, marginBottom: 16, textAlign: 'center' }}>
              Code sent to {magicEmail}
            </Text>
            <Animated.View style={[styles.dotsContainer, { transform: [{ translateX: shakeAnim }] }]}>{codeDots}</Animated.View>
            <PinKeypad
              onDigit={handleDigitCode}
              onDelete={handleDeleteCode}
              onBiometric={undefined}
              biometricEnabled={false}
              cardBg={theme.card}
              textColor={theme.text}
              brandColor={theme.brand}
              mutedColor={theme.muted}
            />
            <TouchableOpacity style={{ marginTop: 12 }} onPress={() => { setStep('magic_send'); setCode(''); setError('') }}>
              <Text style={{ color: theme.textSecondary, fontSize: 13 }}>← Use different email</Text>
            </TouchableOpacity>
          </>
        )}

        {/* PIN dots */}
        {showPinPad && (
          <Animated.View style={[styles.dotsContainer, { transform: [{ translateX: shakeAnim }] }]}>{pinDots}</Animated.View>
        )}

        {error ? <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text> : <View style={styles.errorSpacer} />}

        {/* PIN keypad */}
        {isLoading && (step === 'pin_verify' || step === 'pin_setup') ? (
          <ActivityIndicator size="large" color={theme.brand} style={{ marginTop: 20 }} />
        ) : showPinPad ? (
          <PinKeypad
            onDigit={handleDigit}
            onDelete={handleDelete}
            onBiometric={undefined}
            biometricEnabled={false}
            cardBg={theme.card}
            textColor={theme.text}
            brandColor={theme.brand}
            mutedColor={theme.muted}
          />
        ) : null}

        {/* Join Shop */}
        {step === 'select' && (
          <TouchableOpacity style={{ marginTop: 24 }} onPress={() => setShowJoinSheet(true)}>
            <Text style={{ color: theme.textSecondary, fontSize: 13 }}>New device? </Text>
            <Text style={{ color: theme.brand, fontWeight: '700', fontSize: 13 }}>Join Shop</Text>
          </TouchableOpacity>
        )}

        {/* Magic code divider on select */}
        {step === 'select' && (
          <>
            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
              <Text style={[styles.dividerText, { color: theme.textSecondary }]}>or</Text>
              <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
            </View>
            <TouchableOpacity
              style={[styles.magicButton, { borderColor: theme.border }]}
              onPress={() => { setStep('magic_send'); setError('') }}
              activeOpacity={0.7}
            >
              <Text style={styles.magicButtonText}>Sign in with Email</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Back */}
        {(step === 'pin_verify' || step === 'pin_setup') && (
          <TouchableOpacity style={{ marginTop: 16 }} onPress={() => { setStep('select'); setPin(''); setError('') }}>
            <Text style={{ color: theme.textSecondary, fontSize: 13 }}>← Back</Text>
          </TouchableOpacity>
        )}
      </View>

      {showEmployeePicker && (
        <EmployeePickerModal employees={employees} onSelect={handleEmployeeSelected} onClose={() => setShowEmployeePicker(false)} theme={theme} />
      )}

      <JoinShopSheet visible={showJoinSheet} onClose={() => setShowJoinSheet(false)} onSuccess={() => { setShowJoinSheet(false); reloadEmployees() }} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { alignItems: 'center', width: '100%', paddingHorizontal: 40 },
  logoMark: { width: 72, height: 72, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 28, ...Platform.select({ ios: { shadowColor: '#F97316', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 12 }, android: { elevation: 8 } }) },
  title: { fontSize: 22, fontWeight: '600', marginBottom: 16 },
  dotsContainer: { flexDirection: 'row', gap: 16, marginBottom: 8 },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2 },
  errorText: { fontSize: 13, fontWeight: '500', marginBottom: 4, height: 18 },
  errorSpacer: { height: 18, marginBottom: 4 },
  divider: { flexDirection: 'row', alignItems: 'center', marginTop: 20, marginBottom: 8, gap: 12 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 13 },
  magicButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, gap: 10, backgroundColor: '#fff' },
  magicButtonText: { fontSize: 16, fontWeight: '600', color: '#1F1F1F' },
  primaryButton: { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12, marginTop: 16, width: '100%', alignItems: 'center' },
  primaryButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  emailInput: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, width: '100%' },
  emailTextInput: { flex: 1, fontSize: 16 },
})
