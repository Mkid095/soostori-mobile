// app/_layout.tsx — Root layout with auth gate
import { useEffect, useState } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { View, Text, ActivityIndicator } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { QueryClientProvider } from '@tanstack/react-query'
import { getDb } from '../src/lib/db'
import { getQueryClient } from '../src/lib/query-client'
import { ThemeProvider } from '../src/hooks/useTheme'
import { MenuProvider } from '../src/hooks/MenuContext'
import { AppMenu } from '../src/components/shared/app-menu'

const FIRST_RUN_KEY = '@soostori:firstRun'

type AuthState = 'loading' | 'welcome' | 'auth' | 'app'

export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [authState, setAuthState] = useState<AuthState>('loading')

  useEffect(() => {
    getDb()
      .then(async () => {
        setDbReady(true)
        const firstRun = await AsyncStorage.getItem(FIRST_RUN_KEY)
        if (firstRun === null || firstRun === 'true') {
          setAuthState('welcome')
        } else {
          setAuthState('auth')
        }
      })
      .catch((e) => setError(String(e)))
  }, [])

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <Text style={{ color: '#ef4444', fontSize: 16 }}>Database error: {error}</Text>
      </View>
    )
  }

  if (!dbReady || authState === 'loading') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#f97316" />
        <Text style={{ marginTop: 12, color: '#64748b', fontSize: 14 }}>Loading...</Text>
      </View>
    )
  }

  return (
    <QueryClientProvider client={getQueryClient()}>
      <ThemeProvider>
        <MenuProvider>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false }}>
            {authState === 'welcome' && (
              <Stack.Screen name="welcome" options={{ animation: 'fade' }} />
            )}
            {authState === 'auth' && (
              <Stack.Screen name="auth" options={{ animation: 'fade' }} />
            )}
            <Stack.Screen name="(tabs)" />
          </Stack>
          <AppMenu />
        </MenuProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}