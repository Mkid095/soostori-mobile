// app/(tabs)/settings.tsx — Shop settings screen
import { useState, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme, useAppTheme } from '../../src/hooks/useTheme'
import { getDb } from '../../src/lib/db'
import * as LocalAuthentication from 'expo-local-authentication'
import { ShopDetailsForm } from '../../src/components/settings/shop-details-form'
import { MpesaConfig } from '../../src/components/settings/mpsesa-config'
import { AppearanceSection } from '../../src/components/settings/appearance-section'
import { SecuritySection } from '../../src/components/settings/security-section'
import { PaymentChannelsSection } from '../../src/components/settings/payment-channels-section'
import { DataManagementSection } from '../../src/components/settings/data-management-section'

interface PaymentChannels {
  cash: boolean; mpesaSend: boolean; mpesaPaybill: boolean; bankPaybill: boolean; pochila: boolean
}

const DEFAULT_CHANNELS: PaymentChannels = { cash: true, mpesaSend: false, mpesaPaybill: false, bankPaybill: false, pochila: false }

export default function SettingsScreen() {
  const { bg, card, text, textSecondary: textMuted, border, brand: orange, isDark } = useTheme()
  const { effectiveScheme, toggleScheme } = useAppTheme()

  const [shopName, setShopName] = useState('My Shop')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [footer, setFooter] = useState('')
  const [lowStock, setLowStock] = useState('10')
  const [mpesaPhone, setMpesaPhone] = useState('')
  const [mpesaPaybillNum, setMpesaPaybillNum] = useState('')
  const [mpesaPaybillAcc, setMpesaPaybillAcc] = useState('')
  const [channels, setChannels] = useState<PaymentChannels>(DEFAULT_CHANNELS)
  const [biometricEnabled, setBiometricEnabled] = useState(false)
  const [biometricStatus, setBiometricStatus] = useState('Checking...')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getDb().then(async (db) => {
      const row = await db.getFirstAsync<Record<string, unknown>>('SELECT * FROM shop_settings WHERE id = ?', ['default'])
      if (row) {
        setShopName(String(row.shop_name || 'My Shop'))
        setAddress(row.address ? String(row.address) : '')
        setPhone(row.phone ? String(row.phone) : '')
        setFooter(row.receipt_footer ? String(row.receipt_footer) : '')
        setLowStock(String(row.low_stock_threshold || 10))
        setMpesaPhone(row.mpesa_send_money_phone ? String(row.mpesa_send_money_phone) : '')
        setMpesaPaybillNum(row.mpesa_paybill_number ? String(row.mpesa_paybill_number) : '')
        setMpesaPaybillAcc(row.mpesa_paybill_account ? String(row.mpesa_paybill_account) : '')
        setBiometricEnabled(row.biometric_enabled === 1 || row.biometric_enabled === true)
        try {
          const stored = row.enabled_payment_channels as string | undefined
          if (stored) setChannels(JSON.parse(stored))
        } catch { /* use defaults */ }
      }
    })
    LocalAuthentication.hasHardwareAsync().then((hasHardware: boolean) => {
      if (!hasHardware) { setBiometricStatus('Not available'); return }
      LocalAuthentication.isEnrolledAsync().then((isEnrolled: boolean) => {
        setBiometricStatus(isEnrolled ? 'Ready' : 'Not enrolled')
      })
    })
  }, [])

  async function handleSave() {
    setSaving(true)
    try {
      const db = await getDb()
      const now = new Date().toISOString()
      await db.runAsync(
        `INSERT OR REPLACE INTO shop_settings
          (id, shop_name, address, phone, receipt_footer, receipt_prefix, low_stock_threshold,
           mpesa_send_money_phone, mpesa_paybill_number, mpesa_paybill_account,
           enabled_payment_channels, biometric_enabled, updated_at)
         VALUES ('default', ?, ?, ?, 'INV', ?, ?, ?, ?, ?, ?, ?, ?)`,
        [shopName, address, phone, footer, parseInt(lowStock) || 10,
         mpesaPhone, mpesaPaybillNum, mpesaPaybillAcc,
         JSON.stringify(channels), biometricEnabled ? 1 : 0, now]
      )
      Alert.alert('Saved', 'Settings updated successfully')
    } catch (e) {
      Alert.alert('Error', 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  function toggleChannel(key: keyof PaymentChannels) {
    setChannels(prev => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <ShopDetailsForm
          shopName={shopName} address={address} phone={phone} lowStock={lowStock} footer={footer}
          onShopName={setShopName} onAddress={setAddress} onPhone={setPhone}
          onLowStock={setLowStock} onFooter={setFooter}
        />
        <MpesaConfig
          mpesaPhone={mpesaPhone} mpesaPaybillNum={mpesaPaybillNum} mpesaPaybillAcc={mpesaPaybillAcc}
          onPhone={setMpesaPhone} onPaybillNum={setMpesaPaybillNum} onPaybillAcc={setMpesaPaybillAcc}
        />
        <AppearanceSection isDark={isDark} effectiveScheme={effectiveScheme} onToggle={toggleScheme} orange={orange} />
        <SecuritySection biometricEnabled={biometricEnabled} biometricStatus={biometricStatus} onToggle={setBiometricEnabled} />
        <PaymentChannelsSection channels={channels} onToggle={toggleChannel} />
        <DataManagementSection />
        <TouchableOpacity
          style={{ backgroundColor: saving ? textMuted : orange, borderRadius: 12, paddingVertical: 16, alignItems: 'center' }}
          onPress={handleSave} disabled={saving}
        >
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>{saving ? 'Saving...' : 'Save Settings'}</Text>
        </TouchableOpacity>
        <View style={{ backgroundColor: card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: border, alignItems: 'center' }}>
          <Text style={{ fontWeight: '800', fontSize: 16, color: text }}>Soostori POS</Text>
          <Text style={{ color: textMuted, fontSize: 12, marginTop: 4 }}>Version 1.0.0</Text>
          <Text style={{ color: textMuted, fontSize: 11, marginTop: 8, textAlign: 'center' }}>Offline-first POS • Built with Expo</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
