// app/auth.tsx — Employee login with PIN validation
// - Active employees fetched from local DB
// - PIN validated against PBKDF2 hash in employees table
// - Session stored in AsyncStorage
// - "Join Shop" button for new device pairing
import React, { useState, useCallback, useEffect } from 'react'
import { View, Text, Animated, Platform, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Store, ChevronDown } from 'lucide-react-native'
import { useTheme } from '../src/hooks/useTheme'
import { PinKeypad } from '../src/components/auth/pin-keypad'
import { JoinShopSheet } from '../src/components/shared/join-shop-sheet'
import { lanClient } from '../src/services/lan-client'
import { verifyPin } from '../src/services/db-employees'
import type { Employee } from '../src/lib/sync-protocol'

const PIN_LENGTH = 4
const EMPLOYEE_ID_KEY = '@soostori:employeeId'
const EMPLOYEE_ROLE_KEY = '@soostori:employeeRole'

export default function AuthScreen() {
  const theme = useTheme()

  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [showEmployeePicker, setShowEmployeePicker] = useState(false)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [shakeAnim] = useState(() => new Animated.Value(0))
  const [isValidating, setIsValidating] = useState(false)
  const [showJoinSheet, setShowJoinSheet] = useState(false)

  useEffect(() => {
    loadEmployees()
  }, [])

  async function loadEmployees() {
    // Load employees from local DB via raw SQL (employees table added by Phase 1b)
    try {
      const { getDb } = await import('../src/lib/db')
      const db = await getDb()
      const rows = await db.getAllAsync<Record<string, unknown>>(
        `SELECT id, shop_id, name, email, phone, pin_hash, pin_salt, role, is_active, created_at, updated_at
         FROM employees WHERE is_active = 1 ORDER BY name ASC`
      )
      const emps: Employee[] = rows.map((r) => ({
        id: String(r.id),
        shopId: String(r.shop_id),
        name: String(r.name),
        email: r.email ? String(r.email) : undefined,
        phone: r.phone ? String(r.phone) : undefined,
        pinHash: String(r.pin_hash),
        pinSalt: String(r.pin_salt),
        role: (r.role as Employee['role']) ?? 'attendant',
        isActive: Boolean(r.is_active),
        createdAt: String(r.created_at),
        updatedAt: String(r.updated_at),
      }))
      setEmployees(emps)
      if (emps.length === 1) setSelectedEmployee(emps[0])
    } catch {
      // employees table not yet created (Phase 1b may not be done)
      setEmployees([])
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

  const handleDigit = useCallback(async (digit: string) => {
    if (!selectedEmployee) {
      setError('Please select an employee first')
      return
    }
    if (pin.length >= PIN_LENGTH) return

    const newPin = pin + digit
    setPin(newPin)
    setError('')

    if (newPin.length === PIN_LENGTH) {
      setIsValidating(true)
      try {
        const valid = await verifyPin(newPin, selectedEmployee.pinHash, selectedEmployee.pinSalt)
        if (valid) {
          // Session: store employee ID + role
          await AsyncStorage.setItem(EMPLOYEE_ID_KEY, selectedEmployee.id)
          await AsyncStorage.setItem(EMPLOYEE_ROLE_KEY, selectedEmployee.role)
          // Store device pairing info
          await lanClient.init()
          router.replace('/(tabs)/pos')
        } else {
          shake()
          setError('Incorrect PIN')
          setPin('')
        }
      } catch {
        shake()
        setError('PIN validation failed')
        setPin('')
      } finally {
        setIsValidating(false)
      }
    }
  }, [pin, selectedEmployee, shake])

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

        <Text style={[styles.title, { color: theme.text }]}>Sign In</Text>

        {/* Employee selector */}
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, minWidth: 220, justifyContent: 'space-between', marginBottom: 24 }}
          onPress={() => employees.length > 0 ? setShowEmployeePicker(true) : null}
          disabled={employees.length === 0}
        >
          <Text style={{ fontSize: 15, color: selectedEmployee ? theme.text : theme.textSecondary, flex: 1 }}>
            {selectedEmployee ? selectedEmployee.name : employees.length === 0 ? 'No employees found' : 'Select employee'}
          </Text>
          {employees.length > 0 && <ChevronDown size={16} color={theme.textSecondary} />}
        </TouchableOpacity>

        {/* PIN dots */}
        <Animated.View style={[styles.dotsContainer, { transform: [{ translateX: shakeAnim }] }]}>
          {dots}
        </Animated.View>

        {/* Error */}
        {error
          ? <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>
          : <View style={styles.errorSpacer} />
        }

        {/* Keypad */}
        {isValidating ? (
          <ActivityIndicator size="large" color={theme.brand} style={{ marginTop: 20 }} />
        ) : (
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
        )}

        {/* Join Shop */}
        <TouchableOpacity style={{ marginTop: 24 }} onPress={() => setShowJoinSheet(true)}>
          <Text style={{ color: theme.textSecondary, fontSize: 13 }}>New device? </Text>
          <Text style={{ color: theme.brand, fontWeight: '700', fontSize: 13 }}>Join Shop</Text>
        </TouchableOpacity>
      </View>

      {/* Employee picker modal */}
      {showEmployeePicker && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
          <View style={{ backgroundColor: theme.card, borderRadius: 16, padding: 20, width: '100%', maxWidth: 300 }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: theme.text, marginBottom: 12 }}>Select Employee</Text>
            {employees.map((emp) => (
              <TouchableOpacity
                key={emp.id}
                style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border }}
                onPress={() => { setSelectedEmployee(emp); setShowEmployeePicker(false); setPin('') }}
              >
                <Text style={{ fontSize: 15, fontWeight: '600', color: theme.text }}>{emp.name}</Text>
                <Text style={{ fontSize: 12, color: theme.textSecondary, textTransform: 'capitalize' }}>{emp.role}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={{ marginTop: 12, alignItems: 'center' }} onPress={() => setShowEmployeePicker(false)}>
              <Text style={{ color: theme.brand, fontWeight: '700' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <JoinShopSheet
        visible={showJoinSheet}
        onClose={() => setShowJoinSheet(false)}
        onSuccess={() => { setShowJoinSheet(false); loadEmployees() }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { alignItems: 'center', width: '100%', paddingHorizontal: 40 },
  logoMark: {
    width: 72, height: 72, borderRadius: 20, justifyContent: 'center', alignItems: 'center',
    marginBottom: 28,
    ...Platform.select({
      ios: { shadowColor: '#F97316', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 12 },
      android: { elevation: 8 },
    }),
  },
  title: { fontSize: 22, fontWeight: '600', marginBottom: 16 },
  dotsContainer: { flexDirection: 'row', gap: 16, marginBottom: 8 },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2 },
  errorText: { fontSize: 13, fontWeight: '500', marginBottom: 4, height: 18 },
  errorSpacer: { height: 18, marginBottom: 4 },
})
