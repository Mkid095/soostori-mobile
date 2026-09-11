// app/subscription-blocked.tsx — Full-screen subscription-expired gate
// Shown when the subscription status is 'expired' or 'blocked'.
// No POS / inventory / reports access is permitted while blocked.
import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Platform, Linking, Alert } from 'react-native'
import { router } from 'expo-router'
import { Store, Phone, RefreshCw } from 'lucide-react-native'
import { useTheme } from '../src/hooks/useTheme'
import { revalidateSubscription } from '../src/services/subscription-guard'
import AsyncStorage from '@react-native-async-storage/async-storage'

const CONTACT_PHONE = 'tel:+254732203353'
const SOOSTORI_CONTACT = '+254 732 203 353'

export default function SubscriptionBlockedScreen() {
  const theme = useTheme()
  const [isRetrying, setIsRetrying] = useState(false)

  async function handleRetry() {
    setIsRetrying(true)
    try {
      const shopId = (await AsyncStorage.getItem('@soostori:shopId')) ?? ''
      const ok = await revalidateSubscription(shopId)
      if (ok) {
        // Subscription restored — navigate to app entry to re-check auth state
        router.replace('/auth')
      } else {
        Alert.alert('Still Blocked', 'Your subscription is still inactive. Contact Soostori to renew.')
      }
    } catch { /* ignore */ } finally {
      setIsRetrying(false)
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.logoMark, { backgroundColor: theme.brand }]}>
        <Store size={44} color="#fff" />
      </View>

      <Text style={[styles.title, { color: theme.text }]}>Subscription Expired</Text>
      <Text style={[styles.body, { color: theme.textSecondary }]}>
        Your Soostori subscription has expired.{'\n'}
        Contact Soostori to renew and restore full access.
      </Text>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.brand }]}
        onPress={() => Linking.openURL(CONTACT_PHONE)}
        activeOpacity={0.85}
      >
        <Phone size={18} color="#fff" />
        <Text style={styles.buttonText}>Call Soostori — {SOOSTORI_CONTACT}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.buttonSecondary, { borderColor: theme.border }]}
        onPress={handleRetry}
        disabled={isRetrying}
        activeOpacity={0.85}
      >
        <RefreshCw size={18} color={theme.brand as string} />
        <Text style={[styles.buttonTextSecondary, { color: theme.brand }]}>
          {isRetrying ? 'Checking…' : 'Retry'}
        </Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  logoMark: {
    width: 88,
    height: 88,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    ...Platform.select({
      ios: {
        shadowColor: '#F97316',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.28,
        shadowRadius: 16,
      },
      android: { elevation: 10 },
    }),
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  body: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 36,
  },
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
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  buttonTextSecondary: { fontSize: 17, fontWeight: '600' },
})
