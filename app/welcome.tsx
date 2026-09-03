// app/welcome.tsx — Online-first authentication screen
import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Platform, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { Store, LogIn, Users } from 'lucide-react-native'
import { useTheme } from '../src/hooks/useTheme'
import { LoginForm } from '../src/components/auth/login-form'
import { JoinShopForm } from '../src/components/auth/join-shop-form'

type Step = 'choice' | 'login' | 'join'

export default function WelcomeScreen() {
  const theme = useTheme()
  const [step, setStep] = useState<Step>('choice')
  const [isLoading, setIsLoading] = useState(false)

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.brand as string} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            Connecting to Soostori Cloud...
          </Text>
        </View>
      ) : (
        <View style={styles.content}>
          <View style={[styles.logoMark, { backgroundColor: theme.brand }]}>
            <Store size={44} color="#fff" />
          </View>

          {step === 'choice' && (
            <>
              <Text style={[styles.title, { color: theme.text }]}>Welcome to Soostori POS</Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                Sign in with your Soostori account to continue
              </Text>

              <TouchableOpacity
                style={[styles.button, { backgroundColor: theme.brand }]}
                onPress={() => setStep('login')}
                activeOpacity={0.85}
              >
                <LogIn size={18} color="#fff" />
                <Text style={styles.buttonText}>Login with Soostori Account</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary, { borderColor: theme.border }]}
                onPress={() => setStep('join')}
                activeOpacity={0.85}
              >
                <Users size={18} color={theme.brand as string} />
                <Text style={[styles.buttonTextSecondary, { color: theme.brand }]}>
                  Join Existing Shop
                </Text>
              </TouchableOpacity>
            </>
          )}

          {step === 'login' && (
            <LoginForm
              onBack={() => setStep('choice')}
              onSuccess={() => router.replace('/(tabs)/pos')}
              onLoadingChange={setIsLoading}
            />
          )}

          {step === 'join' && (
            <JoinShopForm
              onBack={() => setStep('choice')}
              onSuccess={() => router.replace('/(tabs)/pos')}
              onLoadingChange={setIsLoading}
            />
          )}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  centered: { alignItems: 'center' },
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
  loadingText: { marginTop: 12, fontSize: 14 },
  button: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
  },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  buttonTextSecondary: { color: '#F97316', fontSize: 17, fontWeight: '600' },
})
