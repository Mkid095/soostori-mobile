// app/welcome.tsx — First-run onboarding screen
import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { router } from 'expo-router'
import { useTheme } from '../src/hooks/useTheme'

const FIRST_RUN_KEY = '@soostori:firstRun'

export default function WelcomeScreen() {
  const theme = useTheme()

  const handleGetStarted = async () => {
    await AsyncStorage.setItem(FIRST_RUN_KEY, 'false')
    router.replace('/(tabs)/pos')
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={styles.content}>
        <View style={[styles.logoContainer, { backgroundColor: theme.brand }]}>
          <Text style={styles.logoText}>S</Text>
        </View>
        <Text style={[styles.title, { color: theme.text }]}>Welcome to Soostori POS</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Your offline-first point of sale system</Text>
        <View style={styles.features}>
          <View style={styles.featureItem}>
            <Text style={[styles.featureIcon, { color: theme.brand }]}>* </Text>
            <Text style={[styles.featureText, { color: theme.text }]}>Works completely offline</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={[styles.featureIcon, { color: theme.brand }]}>* </Text>
            <Text style={[styles.featureText, { color: theme.text }]}>Track inventory in real-time</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={[styles.featureIcon, { color: theme.brand }]}>* </Text>
            <Text style={[styles.featureText, { color: theme.text }]}>Manage sales and debt</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={[styles.featureIcon, { color: theme.brand }]}>* </Text>
            <Text style={[styles.featureText, { color: theme.text }]}>Generate detailed reports</Text>
          </View>
        </View>
        <TouchableOpacity style={[styles.button, { backgroundColor: theme.brand }]} onPress={handleGetStarted} activeOpacity={0.8}>
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { alignItems: 'center', width: '100%', paddingHorizontal: 40 },
  logoContainer: { width: 96, height: 96, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 32 },
  logoText: { fontSize: 48, fontWeight: '700', color: '#fff' },
  title: { fontSize: 26, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 15, textAlign: 'center', marginBottom: 40 },
  features: { width: '100%', marginBottom: 48, gap: 16 },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureIcon: { fontSize: 18, fontWeight: '700' },
  featureText: { fontSize: 15 },
  button: { width: '100%', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '600' },
})