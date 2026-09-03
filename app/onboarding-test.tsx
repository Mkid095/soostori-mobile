// app/onboarding-test.tsx — DEV-ONLY test screen.
// Exists to prove the local session contract works end-to-end without going
// through the magic-code auth flow. NOT mounted in the production tab bar.
// Open manually during development with: expo-router push /onboarding-test

import React from 'react'
import { ScrollView, Text, View, StyleSheet } from 'react-native'
import { useEmployee } from '../src/hooks/useEmployee'
import { useTheme } from '../src/hooks/useTheme'

export default function OnboardingTest() {
  const { employee, shopId, isLoading } = useEmployee()
  const theme = useTheme()

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.bg }]}>
        <Text style={{ color: theme.textSecondary }}>Loading session...</Text>
      </View>
    )
  }

  return (
    <ScrollView
      style={{ backgroundColor: theme.bg }}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.heading, { color: theme.brand }]}>Onboarding Test</Text>
      <Text style={[styles.tagline, { color: theme.textSecondary }]}>
        DEV-ONLY — proves the local session contract.
      </Text>

      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>Employee</Text>
        <Text style={[styles.value, { color: theme.text }]}>
          {employee ? employee.name : 'none'}
        </Text>
        {employee && (
          <Text style={[styles.sub, { color: theme.textSecondary }]}>
            role: {employee.role}  id: {employee.id}
          </Text>
        )}
      </View>

      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>Shop</Text>
        <Text style={[styles.value, { color: theme.text }]}>{shopId || 'none'}</Text>
      </View>

      <Text style={[styles.note, { color: theme.textSecondary }]}>
        If both fields show values above, the session contract between
        AsyncStorage and the employee record is wired correctly.
      </Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 24, gap: 16 },
  heading: { fontSize: 24, fontWeight: '800', marginBottom: 4 },
  tagline: { fontSize: 13, marginBottom: 12 },
  card: { borderWidth: 1, borderRadius: 12, padding: 16, gap: 4 },
  label: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  value: { fontSize: 18, fontWeight: '700' },
  sub: { fontSize: 12 },
  note: { fontSize: 12, lineHeight: 18, marginTop: 8 },
})
