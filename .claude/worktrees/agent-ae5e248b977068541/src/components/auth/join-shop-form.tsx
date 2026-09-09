// Join shop form component — invitation code flow
import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { useTheme } from '../../hooks/useTheme'
import { cloudSendMagicCode, cloudVerifyMagicCode } from '../../services/cloud-auth'

interface Props {
  onBack: () => void
  onSuccess: () => void
  onLoadingChange: (loading: boolean) => void
}

export function JoinShopForm({ onBack, onSuccess, onLoadingChange }: Props) {
  const theme = useTheme()
  const [invitationCode, setInvitationCode] = useState('')
  const [email, setEmail] = useState('')
  const [magicCode, setMagicCode] = useState('')
  const [step, setStep] = useState<'code' | 'email' | 'verify'>('code')
  const [sentEmail, setSentEmail] = useState('')

  async function handleRequestInvitation() {
    if (!invitationCode.trim()) {
      Alert.alert('Missing Code', 'Please enter the shop invitation code.')
      return
    }
    // Store code for later use; next step requests email
    setStep('email')
  }

  async function handleSendCode() {
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.')
      return
    }
    onLoadingChange(true)
    try {
      await cloudSendMagicCode(email.trim())
      setSentEmail(email.trim())
      setStep('verify')
      Alert.alert('Check Your Email', `We sent a magic code to ${email.trim()}`)
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to send code')
    } finally {
      onLoadingChange(false)
    }
  }

  async function handleVerifyCode() {
    if (!magicCode.trim() || magicCode.length < 6) {
      Alert.alert('Missing Code', 'Please enter the 6-digit magic code.')
      return
    }
    onLoadingChange(true)
    try {
      // Verify the magic code and join the shop
      const response = await cloudVerifyMagicCode(email.trim(), magicCode.trim())
      onSuccess()
    } catch (err) {
      Alert.alert('Join Failed', err instanceof Error ? err.message : 'Invalid code')
      setStep('email')
      setMagicCode('')
    } finally {
      onLoadingChange(false)
    }
  }

  return (
    <>
      <Text style={[styles.title, { color: theme.text }]}>
        {step === 'code' ? 'Join Shop' : step === 'email' ? 'Enter Email' : 'Verify Code'}
      </Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
        {step === 'code'
          ? 'Enter the invitation code from the shop owner'
          : step === 'email'
            ? `Code sent to ${sentEmail}`
            : 'Enter the magic code'}
      </Text>

      {step === 'code' && (
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.text }]}>Invitation Code</Text>
          <TextInput
            style={[styles.codeInput, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
            value={invitationCode}
            onChangeText={setInvitationCode}
            placeholder="XXXX-XXXX"
            placeholderTextColor={theme.muted}
            autoCapitalize="characters"
            maxLength={9}
          />
        </View>
      )}

      {step === 'email' && (
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.text }]}>Your Email</Text>
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
      )}

      {step === 'verify' && (
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.text }]}>Magic Code</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
            value={magicCode}
            onChangeText={setMagicCode}
            placeholder="Enter 6-digit code"
            placeholderTextColor={theme.muted}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
          />
        </View>
      )}

      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.brand }]}
        onPress={() => {
          if (step === 'code') handleRequestInvitation()
          else if (step === 'email') handleSendCode()
          else handleVerifyCode()
        }}
        activeOpacity={0.85}
        disabled={
          (step === 'code' && !invitationCode.trim()) ||
          (step === 'email' && !email.trim()) ||
          (step === 'verify' && magicCode.length < 6)
        }
      >
        <Text style={styles.buttonText}>
          {step === 'code' ? 'Continue' : step === 'email' ? 'Send Code' : 'Verify & Join'}
        </Text>
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
  codeInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 16, fontSize: 22, fontWeight: '700', letterSpacing: 4, textAlign: 'center' },
  button: { width: '100%', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  backButton: { marginTop: 16, padding: 8 },
  backText: { fontSize: 15 },
})
