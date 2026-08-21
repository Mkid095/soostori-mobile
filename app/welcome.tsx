// app/welcome.tsx — First-run onboarding screen
import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { router } from 'expo-router'
import { Store, Check } from 'lucide-react-native'
import { useTheme } from '../src/hooks/useTheme'

const FIRST_RUN_KEY = '@soostori:firstRun'

const FEATURES = [
  'Works completely offline',
  'Track inventory in real-time',
  'Manage sales and debt',
  'Generate detailed reports',
]

export default function WelcomeScreen() {
  const theme = useTheme()

  const handleGetStarted = async () => {
    await AsyncStorage.setItem(FIRST_RUN_KEY, 'false')
    router.replace('/(tabs)/pos')
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={styles.content}>
        {/* Logo mark */}
        <View style={[styles.logoMark, { backgroundColor: theme.brand }]}>
          <Store size={44} color="#fff" />
        </View>

        <Text style={[styles.title, { color: theme.text }]}>Welcome to Soostori POS</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Your offline-first point of sale system</Text>

        {/* Feature list */}
        <View style={styles.features}>
          {FEATURES.map((feature) => (
            <View key={feature} style={styles.featureItem}>
              <View style={[styles.checkBadge, { backgroundColor: theme.brand + '20' }]}>
                <Check size={14} color={theme.brand as string} strokeWidth={3} />
              </View>
              <Text style={[styles.featureText, { color: theme.text }]}>{feature}</Text>
            </View>
          ))}
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.brand }]}
          onPress={handleGetStarted}
          activeOpacity={0.85}
        >
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { alignItems: 'center', width: '100%', paddingHorizontal: 40 },
  logoMark: {
    width: 88,
    height: 88,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
    ...Platform.select({
      ios: { shadowColor: '#F97316', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.28, shadowRadius: 16 },
      android: { elevation: 10 },
    }),
  },
  title: { fontSize: 26, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 15, textAlign: 'center', marginBottom: 36 },
  features: { width: '100%', marginBottom: 44, gap: 16 },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: { fontSize: 15, fontWeight: '500', flex: 1 },
  button: { width: '100%', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '600' },
})