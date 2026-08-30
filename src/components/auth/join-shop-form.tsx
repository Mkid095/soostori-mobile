// Join shop form component — invitation flow
import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { useTheme } from '../../hooks/useTheme'

interface Props {
  onBack: () => void
  onLoadingChange: (loading: boolean) => void
}

export function JoinShopForm({ onBack, onLoadingChange }: Props) {
  const theme = useTheme()
  const [shopCode, setShopCode] = useState('')

  async function handleJoinShop() {
    if (!shopCode.trim()) {
      Alert.alert('Missing Code', 'Please enter the shop invitation code.')
      return
    }
    onLoadingChange(true)
    try {
      // TODO: implement invitation flow once cloud API is defined
      throw new Error('Cloud API not yet defined — pending sync-contract.md from web team')
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (message.includes('Cloud API not yet defined')) {
        Alert.alert(
          'Cloud Not Available',
          'Internet connection required to join an existing shop. Please connect and try again.'
        )
      } else {
        Alert.alert('Join Failed', message)
      }
    } finally {
      onLoadingChange(false)
    }
  }

  return (
    <>
      <Text style={[styles.title, { color: theme.text }]}>Join Existing Shop</Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
        Enter the invitation code from the shop owner
      </Text>

      <View style={[styles.codeCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <TextInput
          style={[styles.codeInput, { color: theme.text }]}
          value={shopCode}
          onChangeText={setShopCode}
          placeholder="XXXX-XXXX"
          placeholderTextColor={theme.muted}
          autoCapitalize="characters"
          maxLength={9}
        />
      </View>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.brand }]}
        onPress={handleJoinShop}
        activeOpacity={0.85}
      >
        <Text style={styles.buttonText}>Join Shop</Text>
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
  codeCard: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 16,
    marginBottom: 24,
    alignItems: 'center',
  },
  codeInput: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 4,
    textAlign: 'center',
    width: '100%',
  },
  button: { width: '100%', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  backButton: { marginTop: 16, padding: 8 },
  backText: { fontSize: 15 },
})
