// app/_layout.tsx — Root layout with auth gate + device recovery
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
import { useCloudSync } from '../src/hooks/useCloudSync'
import { useDeviceHeartbeat } from '../src/hooks/useDeviceHeartbeat'
import { isWithinGraceWindow } from '../src/services/entitlement-cache'
import { isNewDevice, importCloudSnapshot } from '../src/services/db-device-recovery'
import { cloudDownloadSnapshot } from '../src/services/cloud-snapshot'
import { getSession } from '../src/services/cloud-auth'

type AuthState = 'loading' | 'welcome' | 'auth' | 'app'

export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [authState, setAuthState] = useState<AuthState>('loading')

  // Cloud sync worker + device heartbeat — only active when authed into app
  useCloudSync()
  useDeviceHeartbeat()

  useEffect(() => {
    getDb()
      .then(async () => {
        setDbReady(true)
        // Check cloud session
        const session = await getSession()
        if (!session.userId) {
          setAuthState('welcome')
          return
        }
        const withinGrace = await isWithinGraceWindow()
        if (withinGrace && session.employeeId) {
          setAuthState('app')
        } else {
          setAuthState('auth')
        }
      })
      .catch((e) => setError(String(e)))
  }, [])

  // Device recovery check after cloud auth succeeds
  useEffect(() => {
    if (authState !== 'app') return
    const checkRecovery = async () => {
      try {
        const newDevice = await isNewDevice()
        if (!newDevice) return
        let snapshot: Record<string, unknown> | null = null
        try {
          const shopId = await AsyncStorage.getItem('@soostori:shopId')
          snapshot = shopId ? await cloudDownloadSnapshot(shopId) : null
        } catch {
          return
        }
        if (!snapshot) return
        const { Alert } = await import('react-native')
        Alert.alert(
          'Restore from Cloud',
          'This device is not registered. Would you like to restore your shop data from the cloud?',
          [
            { text: 'Start Fresh', style: 'cancel' },
            {
              text: 'Restore',
              onPress: async () => {
                try {
                  await importCloudSnapshot(snapshot!)
                } catch {
                  Alert.alert('Recovery Failed', 'Could not restore from cloud. Starting fresh.')
                }
              },
            },
          ]
        )
      } catch {
        // Recovery check failed silently
      }
    }
    checkRecovery()
  }, [authState])

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
        </MenuProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
