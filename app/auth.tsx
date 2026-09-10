// app/auth.tsx — Employee login: local PIN or Google Sign-In + OperationalAuth enrollment
import React, { useState, useCallback } from 'react'
import { View, Text, Animated, Platform, TouchableOpacity, ActivityIndicator, StyleSheet, Alert } from 'react-native'
import { router } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Store, ChevronDown } from 'lucide-react-native'
import { useTheme } from '../src/hooks/useTheme'
import { PinKeypad } from '../src/components/auth/pin-keypad'
import { PersonNotFoundScreen } from '../src/components/auth/person-not-found-screen'
import { JoinShopSheet } from '../src/components/shared/join-shop-sheet'
import { EmployeePickerModal } from '../src/components/auth/employee-picker-modal'
import { useAuthSdk } from '../src/hooks/useAuthSdk'
import { useAuthEmployees } from '../src/hooks/useAuthEmployees'
import { signInWithGoogle } from '../src/services/google-sign-in-service'

const PIN_LENGTH = 4
const EMPLOYEE_ID_KEY = '@soostori:employeeId'
const EMPLOYEE_ROLE_KEY = '@soostori:employeeRole'

type Step = 'select' | 'cloud_auth' | 'enrollment' | 'pin_verify' | 'pin_setup' | 'loading' | 'person_not_found'

export default function AuthScreen() {
  const theme = useTheme()
  const { employees, reload: reloadEmployees } = useAuthEmployees()
  const auth = useAuthSdk()

  const [selectedEmployee, setSelectedEmployee] = useState<import('../src/lib/sync-protocol').Employee | null>(null)
  const [showEmployeePicker, setShowEmployeePicker] = useState(false)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [shakeAnim] = useState(() => new Animated.Value(0))
  const [isValidating, setIsValidating] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [showJoinSheet, setShowJoinSheet] = useState(false)
  const [step, setStep] = useState<Step>('select')
  // For PIN setup during enrollment
  const [enrollPin, setEnrollPin] = useState('')

  const shake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start()
  }, [shakeAnim])

  // Navigate once operational
  const navigateToPos = useCallback(async (employeeId: string, role: string) => {
    await AsyncStorage.setItem(EMPLOYEE_ID_KEY, employeeId)
    await AsyncStorage.setItem(EMPLOYEE_ROLE_KEY, role)
    router.replace('/(tabs)/pos')
  }, [])

  // Handle PIN digit entry for local PIN login (returning employee)
  const handleDigit = useCallback(async (digit: string) => {
    if (pin.length >= PIN_LENGTH) return
    const newPin = pin + digit
    setPin(newPin)
    setError('')
    if (newPin.length === PIN_LENGTH) {
      setIsValidating(true)
      try {
        if (step === 'pin_setup') {
          // Setting up a new PIN during enrollment
          const result = await auth.setupPin(newPin)
          if (result.ok) {
            await navigateToPos(auth.cloudUser?.id ?? selectedEmployee?.id ?? '', auth.cloudUser?.id ? 'owner' : (selectedEmployee?.role ?? 'attendant'))
          } else {
            shake(); setError(result.error?.message ?? 'PIN setup failed'); setPin('')
          }
        } else if (step === 'pin_verify') {
          // Verifying existing PIN to unlock operational session
          const result = await auth.verifyPin(newPin)
          if (result.ok) {
            await navigateToPos(auth.cloudUser?.id ?? selectedEmployee?.id ?? '', auth.cloudUser?.id ? 'owner' : (selectedEmployee?.role ?? 'attendant'))
          } else {
            shake(); setError(result.error?.message ?? 'Incorrect PIN'); setPin('')
          }
        }
      } catch {
        shake(); setError('PIN validation failed'); setPin('')
      } finally {
        setIsValidating(false)
      }
    }
  }, [pin, step, auth, selectedEmployee, shake, navigateToPos])

  // Handle delete
  const handleDelete = useCallback(() => { setPin((p) => p.slice(0, -1)); setError('') }, [])

  // Google Sign-In → cloud auth → enrollment flow
  const handleGoogleSignIn = useCallback(async () => {
    setIsGoogleLoading(true)
    setError('')
    try {
      const googleUser = await signInWithGoogle()
      const result = await auth.signInWithGoogle(googleUser.idToken)
      if (!result.ok) {
        // §17/§84: no membership for this authenticated person — show the
        // §29 contact phone, do not attempt to create a shop.
        if (result.error?.code === 'PERSON_NOT_FOUND') {
          setStep('person_not_found')
          return
        }
        Alert.alert('Sign-In Error', result.error?.message ?? 'Authentication failed')
        setStep('select')
        return
      }

      // Enrollment state determines next step
      switch (auth.enrollmentState) {
        case 'DEVICE_NOT_ENROLLED':
          setStep('enrollment')
          break
        case 'PIN_SETUP_REQUIRED':
          setStep('pin_setup')
          break
        case 'PIN_VERIFICATION_REQUIRED':
          setStep('pin_verify')
          break
        case 'OPERATIONAL':
          await navigateToPos(auth.cloudUser?.id ?? '', 'owner')
          break
        default:
          // Unknown state — prompt enrollment
          setStep('enrollment')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Google sign-in failed'
      Alert.alert('Sign-In Error', message)
      setStep('select')
    } finally {
      setIsGoogleLoading(false)
    }
  }, [auth, navigateToPos])

  // Begin enrollment (new device)
  const handleBeginEnrollment = useCallback(async () => {
    setIsValidating(true)
    setError('')
    try {
      const result = await auth.beginEnrollment()
      if (result.ok && 'nextState' in result.data) {
        setStep(result.data.nextState === 'PIN_SETUP_REQUIRED' ? 'pin_setup' : 'select')
      } else if (result.ok && 'needsCloudVerify' in result.data) {
        // Need to verify existing PIN first
        setStep('pin_verify')
      } else if (!result.ok) {
        setError(result.error?.message ?? 'Enrollment failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enrollment failed')
    } finally {
      setIsValidating(false)
    }
  }, [auth])

  // Continue to PIN setup after cloud verify
  const handleContinueToPinSetup = useCallback(async () => {
    // PIN already entered in cloud_verify step → now set up local PIN
    setStep('pin_setup')
  }, [])

  // Employee selected for local PIN login (returning device)
  const handleEmployeeSelected = useCallback((emp: typeof selectedEmployee) => {
    setSelectedEmployee(emp)
    setShowEmployeePicker(false)
    setPin('')
    setStep('pin_verify')
  }, [])

  const dots = Array.from({ length: PIN_LENGTH }).map((_, i) => (
    <View key={i} style={[styles.dot, { backgroundColor: i < pin.length ? theme.brand : 'transparent', borderColor: i < pin.length ? theme.brand : theme.muted }]} />
  ))

  // §17/§84: short-circuit the whole auth UI to the §29 contact screen
  // when the authenticated person has no Soostori membership.
  if (step === 'person_not_found') {
    return (
      <PersonNotFoundScreen
        email={auth.cloudUser?.email ?? null}
        onBack={() => { setStep('select'); setError('') }}
      />
    )
  }

  // Determine what to show in the PIN pad area
  const showPinPad = step === 'pin_verify' || step === 'pin_setup'
  const showEnrollmentOptions = step === 'enrollment'
  const showCloudLoading = step === 'cloud_auth' || isGoogleLoading || isValidating
  const title = step === 'pin_setup' ? 'Set Your PIN' : step === 'pin_verify' ? 'Enter PIN' : step === 'enrollment' ? 'Device Setup' : 'Sign In'

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={styles.content}>
        <View style={[styles.logoMark, { backgroundColor: theme.brand }]}>
          <Store size={36} color="#fff" />
        </View>
        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>

        {/* Employee selector — shown when employee list is populated */}
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

        {/* No employees — force cloud auth */}
        {step === 'select' && employees.length === 0 && (
          <Text style={{ color: theme.textSecondary, fontSize: 14, marginBottom: 24, textAlign: 'center' }}>
            Sign in with Google to get started
          </Text>
        )}

        {/* PIN dots */}
        {showPinPad && (
          <Animated.View style={[styles.dotsContainer, { transform: [{ translateX: shakeAnim }] }]}>{dots}</Animated.View>
        )}
        {error ? <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text> : <View style={styles.errorSpacer} />}

        {/* Loading */}
        {showCloudLoading ? (
          <ActivityIndicator size="large" color={theme.brand} style={{ marginTop: 20 }} />
        ) : showPinPad ? (
          <PinKeypad onDigit={handleDigit} onDelete={handleDelete} onBiometric={undefined} biometricEnabled={false} cardBg={theme.card} textColor={theme.text} brandColor={theme.brand} mutedColor={theme.muted} />
        ) : showEnrollmentOptions ? (
          <View style={{ alignItems: 'center', gap: 12 }}>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: theme.brand }]}
              onPress={handleBeginEnrollment}
            >
              <Text style={styles.primaryButtonText}>Set Up Device</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setStep('select')}>
              <Text style={{ color: theme.textSecondary, fontSize: 13 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Join Shop */}
        {step === 'select' && (
          <TouchableOpacity style={{ marginTop: 24 }} onPress={() => setShowJoinSheet(true)}>
            <Text style={{ color: theme.textSecondary, fontSize: 13 }}>New device? </Text>
            <Text style={{ color: theme.brand, fontWeight: '700', fontSize: 13 }}>Join Shop</Text>
          </TouchableOpacity>
        )}

        {/* Divider */}
        {step === 'select' && (
          <>
            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
              <Text style={[styles.dividerText, { color: theme.textSecondary }]}>or</Text>
              <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
            </View>
            <TouchableOpacity
              style={[styles.googleButton, { backgroundColor: '#fff', borderColor: theme.border }]}
              onPress={handleGoogleSignIn}
              activeOpacity={0.7}
            >
              <Text style={styles.googleButtonText}>Sign in with Google</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Back to select */}
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
  googleButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, gap: 10 },
  googleButtonText: { fontSize: 16, fontWeight: '600', color: '#1F1F1F' },
  primaryButton: { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 },
  primaryButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
})
