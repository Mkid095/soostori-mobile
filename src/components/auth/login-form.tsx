// Login form component — cloud authentication
import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useTheme } from '../../hooks/useTheme'
import { cloudLogin } from '../../services/cloud-auth'
import { cacheEntitlement } from '../../services/entitlement-cache'

interface Props {
  onBack: () => void
  onSuccess: () => void
  onLoadingChange: (loading: boolean) => void
}

const CLOUD_TOKEN_KEY = '@soostori:cloudToken'

export function LoginForm({ onBack, onSuccess, onLoadingChange }: Props) {
  const theme = useTheme()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing Fields', 'Please enter your email and password.')
      return
    }
    onLoadingChange(true)
    try {
      const response = await cloudLogin(email.trim(), password)
      await AsyncStorage.setItem(CLOUD_TOKEN_KEY, response.user.id)
      await cacheEntitlement(response.entitlement, response.serverTime)
      onSuccess()
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (message.includes('Cloud API not yet defined')) {
        Alert.alert(
          'Cloud Not Available',
          'Internet connection required for first-time setup. Please connect and try again.'
        )
      } else {
        Alert.alert('Login Failed', message)
      }
    } finally {
      onLoadingChange(false)
    }
  }

  return (
    <>
      <Text style={[styles.title, { color: theme.text }]}>Sign In</Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
        Enter your Soostori account credentials
      </Text>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: theme.text }]}>Email</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor={theme.muted}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: theme.text }]}>Password</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
          value={password}
          onChangeText={setPassword}
          placeholder="Your password"
          placeholderTextColor={theme.muted}
          secureTextEntry
        />
      </View>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.brand }]}
        onPress={handleLogin}
        activeOpacity={0.85}
      >
        <Text style={styles.buttonText}>Sign In</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={[styles.backText, { color: theme.textSecondary }]}>Back</Text>
      </TouchableOpacity>
    </>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 15, textAlign: 'center', marginBottom: 36 },
  inputGroup: { width: '100%', marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  button: { width: '100%', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  backButton: { marginTop: 16, padding: 8 },
  backText: { fontSize: 15 },
})
