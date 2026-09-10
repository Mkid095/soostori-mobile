// PersonNotFoundScreen — shown when a successfully-authenticated Person has no
// Soostori membership (§29). Businesses are created by an authorized
// salesperson, not by self-signup. The contact phone MUST come from
// @soostori/core (UNAUTHORIZED_LOGIN_CONTACT_PHONE) — never hardcode.
//
// §17/§84: this screen replaces the previous auto-create-shop behaviour.
// Pure presentation: no business logic, no API calls.
import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Platform, Linking } from 'react-native'
import { Phone, ShieldOff, ArrowLeft } from 'lucide-react-native'
import { UNAUTHORIZED_LOGIN_CONTACT_PHONE } from '@soostori/core'
import { useTheme } from '../../hooks/useTheme'

interface Props {
  onBack?: () => void
  email?: string | null
}

export function PersonNotFoundScreen({ onBack, email }: Props) {
  const theme = useTheme()

  const handleCall = () => {
    // Convert display phone to tel: URI by stripping spaces
    const telUri = `tel:${UNAUTHORIZED_LOGIN_CONTACT_PHONE.replace(/\s+/g, '')}`
    Linking.openURL(telUri).catch(() => {
      /* device without dialer — non-fatal */
    })
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.iconMark, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <ShieldOff size={40} color={theme.textSecondary} />
      </View>

      <Text style={[styles.title, { color: theme.text }]}>Access Unavailable</Text>

      <Text style={[styles.body, { color: theme.textSecondary }]}>
        Registration is required. Soostori businesses are created through an
        authorized salesperson.
      </Text>

      {email ? (
        <Text style={[styles.email, { color: theme.muted }]} numberOfLines={1}>
          Account: {email}
        </Text>
      ) : null}

      <TouchableOpacity
        style={[styles.contactButton, { backgroundColor: theme.brand }]}
        onPress={handleCall}
        activeOpacity={0.85}
        accessibilityLabel={`Call ${UNAUTHORIZED_LOGIN_CONTACT_PHONE}`}
      >
        <Phone size={18} color="#fff" />
        <Text style={styles.contactButtonText}>{UNAUTHORIZED_LOGIN_CONTACT_PHONE}</Text>
      </TouchableOpacity>

      {onBack ? (
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <ArrowLeft size={14} color={theme.textSecondary} />
          <Text style={[styles.backText, { color: theme.textSecondary }]}>Back to sign in</Text>
        </TouchableOpacity>
      ) : null}
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
  iconMark: {
    width: 88,
    height: 88,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
    borderWidth: 1,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
      android: { elevation: 2 },
    }),
  },
  title: { fontSize: 22, fontWeight: '600', marginBottom: 12, textAlign: 'center' },
  body: { fontSize: 15, textAlign: 'center', marginBottom: 12, lineHeight: 22 },
  email: { fontSize: 13, marginBottom: 28 },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  contactButtonText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 24,
    padding: 8,
  },
  backText: { fontSize: 13 },
})
