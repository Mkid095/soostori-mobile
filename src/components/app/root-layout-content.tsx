// root-layout-content.tsx — Auth gate + device recovery for RootLayout
import { useEffect, useState } from 'react'
import { View, Text, ActivityIndicator } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '../../hooks/useTheme'
import { MenuProvider } from '../../hooks/MenuContext'
import { BusinessProvider } from '../../hooks/BusinessContext'
import { useCloudSync } from '../../hooks/useCloudSync'
import { useDeviceHeartbeat } from '../../hooks/useDeviceHeartbeat'
import { isWithinGraceWindow } from '../../services/entitlement-cache'
import { getSession } from '../../services/cloud-auth'
import { attachSdkBridges } from '../../services/sdk-bridge/bootstrap'
import { mobileUpdateManager } from '../../services/adapters/updates/mobile-update-manager'
import { UpdateBanner } from '../shared/update-banner'
import { getUpdateState } from '../../services/db-update-state'
import { getQueryClient } from '../../lib/query-client'
import { getDb } from '../../lib/db'
import { initMobileSync, startSyncListeners, stopSyncListeners } from '../../services/mobile-sync-service'
import { BusinessSwitcherHost } from './BusinessSwitcherHost'
import { getCurrentSubscription, revalidateSubscription } from '../../services/subscription-guard'

type AuthState = 'loading' | 'welcome' | 'auth' | 'app' | 'blocked'

function RootLoading() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
      <ActivityIndicator size="large" color="#f97316" />
      <Text style={{ marginTop: 12, color: '#64748b', fontSize: 14 }}>Loading...</Text>
    </View>
  )
}

function RootError({ msg }: { msg: string }) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
      <Text style={{ color: '#ef4444', fontSize: 16 }}>Database error: {msg}</Text>
    </View>
  )
}

// Lazy-load subscription blocked screen to avoid circular imports
function SubscriptionBlockedFallback() {
  const { default: Screen } = require('../../../app/subscription-blocked')
  return <Screen />
}

export function RootLayoutContent() {
  const [dbReady, setDbReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [authState, setAuthState] = useState<AuthState>('loading')

  useCloudSync()
  useDeviceHeartbeat()

  // Phase 05: init real FIDScript-backed sync engine and start resume/reconnect listeners
  useEffect(() => {
    initMobileSync().catch(console.warn)
    startSyncListeners()
    return () => stopSyncListeners()
  }, [])

  useEffect(() => { if (!dbReady) return; return attachSdkBridges() }, [dbReady])

  useEffect(() => {
    if (!dbReady) return
    ;(async () => {
      try {
        const saved = await getUpdateState()
        if (saved.downloadedVersion && saved.updateType === 'OTA' && saved.isRuntimeCompatible === 1) {
          mobileUpdateManager.checkForUpdate()
        }
      } catch { /* non-critical */ }
    })()
  }, [dbReady])

  useEffect(() => {
    getDb()
      .then(async () => {
        setDbReady(true)
        const session = await getSession()
        if (!session.userId) { setAuthState('welcome'); return }

        // Phase 18: attempt one cloud revalidation before showing the app
        const shopId = session.shopId ?? ''
        if (shopId) {
          await revalidateSubscription(shopId).catch(() => {})
        }
        const subStatus = await getCurrentSubscription()
        if (subStatus === 'expired') {
          setAuthState('blocked')
          return
        }

        setAuthState((await isWithinGraceWindow()) && session.employeeId ? 'app' : 'auth')
      })
      .catch((e: unknown) => setError(String(e)))
  }, [])

  if (error) return <RootError msg={error} />
  if (!dbReady || authState === 'loading') return <RootLoading />
  if (authState === 'blocked') return <SubscriptionBlockedFallback />

  return (
    <QueryClientProvider client={getQueryClient()}>
      <ThemeProvider>
        <MenuProvider>
          <BusinessProvider>
            <StatusBar style="dark" />
            <UpdateBanner />
            <Stack screenOptions={{ headerShown: false }}>
              {authState === 'welcome' && <Stack.Screen name="welcome" options={{ animation: 'fade' }} />}
              {authState === 'auth' && <Stack.Screen name="auth" options={{ animation: 'fade' }} />}
              <Stack.Screen name="(tabs)" />
            </Stack>
            <BusinessSwitcherHost />
          </BusinessProvider>
        </MenuProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
