import { useState, useEffect } from 'react'
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert, Switch } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme, useAppTheme } from '../../src/hooks/useTheme'
import { getDb } from '../../src/lib/db'
import { cacheDirectory, writeAsStringAsync, EncodingType } from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'
import * as LocalAuthentication from 'expo-local-authentication'
import { getShopSettings } from '../../src/services/db-settings'

interface PaymentChannels {
  cash: boolean
  mpesaSend: boolean
  mpesaPaybill: boolean
  bankPaybill: boolean
  pochila: boolean
}

const DEFAULT_CHANNELS: PaymentChannels = {
  cash: true,
  mpesaSend: false,
  mpesaPaybill: false,
  bankPaybill: false,
  pochila: false,
}

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
    // Check biometric hardware status
    LocalAuthentication.hasHardwareAsync().then((hasHardware) => {
      if (!hasHardware) { setBiometricStatus('Not available'); return }
      LocalAuthentication.isEnrolledAsync().then((isEnrolled) => {
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

  async function handleExport() {
    try {
      const db = await getDb()
      const products = await db.getAllAsync<unknown>('SELECT * FROM products')
      const categories = await db.getAllAsync<unknown>('SELECT * FROM categories')
      const sales = await db.getAllAsync<unknown>('SELECT * FROM sales')
      const debts = await db.getAllAsync<unknown>('SELECT * FROM debts')
      const settings = await db.getFirstAsync<unknown>('SELECT * FROM shop_settings WHERE id = ?', ['default'])
      const backup = {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        data: { products, categories, sales, debts, settings }
      }
      const json = JSON.stringify(backup, null, 2)
      const uri = (cacheDirectory || '') + 'soostori-backup.json'
      await writeAsStringAsync(uri, json, { encoding: EncodingType.UTF8 })
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/json', dialogTitle: 'Export Soostori Backup' })
      } else {
        Alert.alert('Export', 'Backup saved to cache. Sharing not available.')
      }
    } catch (e) {
      Alert.alert('Export Error', String(e))
    }
  }

  async function handleImport() {
    Alert.alert(
      'Import Data',
      'Import replaces all current data. This cannot be undone.\n\nTo import: share your backup .json file with the app.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue', onPress: () => Alert.alert('Info', 'Import requires sharing the backup file to this app.') }
      ]
    )
  }

  const inputStyle = { backgroundColor: bg, borderRadius: 10 as const, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 as const, color: text, borderWidth: 1 as const, borderColor: border }

  function ChannelToggle({ label, value, onToggle }: { label: string; value: boolean; onToggle: () => void }) {
    return (
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 }}>
        <Text style={{ fontSize: 14, color: text, fontWeight: '600' }}>{label}</Text>
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: isDark ? '#334155' : '#e2e8f0', true: orange }}
          thumbColor="#fff"
        />
      </View>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>

        {/* Section 1: Shop Details */}
        <View style={{ backgroundColor: card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: border }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: text, marginBottom: 14 }}>Shop Details</Text>
          <View style={{ gap: 12 }}>
            <View>
              <Text style={{ fontSize: 12, fontWeight: '700', color: textMuted, marginBottom: 6 }}>Shop Name</Text>
              <TextInput style={inputStyle} value={shopName} onChangeText={setShopName} placeholder="My Shop" placeholderTextColor={textMuted} />
            </View>
            <View>
              <Text style={{ fontSize: 12, fontWeight: '700', color: textMuted, marginBottom: 6 }}>Address</Text>
              <TextInput style={inputStyle} value={address} onChangeText={setAddress} placeholder="123 Main Street, City" placeholderTextColor={textMuted} />
            </View>
            <View>
              <Text style={{ fontSize: 12, fontWeight: '700', color: textMuted, marginBottom: 6 }}>Phone</Text>
              <TextInput style={inputStyle} value={phone} onChangeText={setPhone} placeholder="+254 700 000 000" placeholderTextColor={textMuted} keyboardType="phone-pad" />
            </View>
            <View>
              <Text style={{ fontSize: 12, fontWeight: '700', color: textMuted, marginBottom: 6 }}>Low Stock Alert Threshold</Text>
              <TextInput style={inputStyle} value={lowStock} onChangeText={setLowStock} placeholder="10" placeholderTextColor={textMuted} keyboardType="number-pad" />
            </View>
          </View>
        </View>

        {/* Section 2: Receipt */}
        <View style={{ backgroundColor: card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: border }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: text, marginBottom: 14 }}>Receipt</Text>
          <View>
            <Text style={{ fontSize: 12, fontWeight: '700', color: textMuted, marginBottom: 6 }}>Footer Message</Text>
            <TextInput style={inputStyle} value={footer} onChangeText={setFooter} placeholder="Thank you for shopping!" placeholderTextColor={textMuted} />
          </View>
        </View>

        {/* Section 3: M-Pesa Configuration */}
        <View style={{ backgroundColor: card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: border }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: text, marginBottom: 14 }}>M-Pesa Configuration</Text>
          <View style={{ gap: 12 }}>
            <View>
              <Text style={{ fontSize: 12, fontWeight: '700', color: textMuted, marginBottom: 6 }}>M-Pesa Send Money (Phone)</Text>
              <TextInput style={inputStyle} value={mpesaPhone} onChangeText={setMpesaPhone} placeholder="+254 700 000 000" placeholderTextColor={textMuted} keyboardType="phone-pad" />
            </View>
            <View>
              <Text style={{ fontSize: 12, fontWeight: '700', color: textMuted, marginBottom: 6 }}>M-Pesa Paybill Number</Text>
              <TextInput style={inputStyle} value={mpesaPaybillNum} onChangeText={setMpesaPaybillNum} placeholder="Paybill number" placeholderTextColor={textMuted} keyboardType="number-pad" />
            </View>
            <View>
              <Text style={{ fontSize: 12, fontWeight: '700', color: textMuted, marginBottom: 6 }}>M-Pesa Paybill Account</Text>
              <TextInput style={inputStyle} value={mpesaPaybillAcc} onChangeText={setMpesaPaybillAcc} placeholder="Account number" placeholderTextColor={textMuted} />
            </View>
          </View>
        </View>

        {/* Section 4: Appearance */}
        <View style={{ backgroundColor: card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: border }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: text, marginBottom: 14 }}>Appearance</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ fontSize: 14, color: text, fontWeight: '600' }}>Dark Mode</Text>
              <Text style={{ fontSize: 12, color: textMuted, marginTop: 2 }}>Currently: {effectiveScheme === 'dark' ? 'Dark' : 'Light'}</Text>
            </View>
            <Switch
              value={effectiveScheme === 'dark'}
              onValueChange={toggleScheme}
              trackColor={{ false: isDark ? '#334155' : '#e2e8f0', true: orange }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Section 5: Security */}
        <View style={{ backgroundColor: card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: border }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: text, marginBottom: 14 }}>Security</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, color: text, fontWeight: '600' }}>Biometric Authentication</Text>
              <Text style={{ fontSize: 12, color: textMuted, marginTop: 2 }}>
                Status: {biometricStatus}
              </Text>
            </View>
            <Switch
              value={biometricEnabled}
              onValueChange={(val) => {
                if (val && biometricStatus !== 'Ready') {
                  Alert.alert('Unavailable', 'Please enroll fingerprint/face in device settings first.')
                  return
                }
                setBiometricEnabled(val)
              }}
              trackColor={{ false: isDark ? '#334155' : '#e2e8f0', true: orange }}
              thumbColor="#fff"
              disabled={biometricStatus !== 'Ready'}
            />
          </View>
          <Text style={{ fontSize: 11, color: textMuted, marginTop: 8 }}>
            Use fingerprint or face recognition to unlock the app
          </Text>
        </View>

        {/* Section 6: Payment Channels */}
        <View style={{ backgroundColor: card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: border }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: text, marginBottom: 4 }}>Payment Channels</Text>
          <Text style={{ fontSize: 11, color: textMuted, marginBottom: 12 }}>Enable or disable payment methods shown at checkout</Text>
          <ChannelToggle label="Cash" value={channels.cash} onToggle={() => toggleChannel('cash')} />
          <View style={{ height: 1, backgroundColor: border }} />
          <ChannelToggle label="M-Pesa Send Money" value={channels.mpesaSend} onToggle={() => toggleChannel('mpesaSend')} />
          <View style={{ height: 1, backgroundColor: border }} />
          <ChannelToggle label="M-Pesa Paybill" value={channels.mpesaPaybill} onToggle={() => toggleChannel('mpesaPaybill')} />
          <View style={{ height: 1, backgroundColor: border }} />
          <ChannelToggle label="Bank Paybill" value={channels.bankPaybill} onToggle={() => toggleChannel('bankPaybill')} />
          <View style={{ height: 1, backgroundColor: border }} />
          <ChannelToggle label="Pochi La Biashara" value={channels.pochila} onToggle={() => toggleChannel('pochila')} />
        </View>

        {/* Section 7: Data Management */}
        <View style={{ backgroundColor: card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: border }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: text, marginBottom: 4 }}>Data Management</Text>
          <Text style={{ fontSize: 11, color: textMuted, marginBottom: 12 }}>Backup or restore all your data</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              style={{ flex: 1, backgroundColor: orange, borderRadius: 10, paddingVertical: 12, alignItems: 'center' }}
              onPress={handleExport}
            >
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>Export Backup</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ flex: 1, backgroundColor: isDark ? '#334155' : '#f1f5f9', borderRadius: 10, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: border }}
              onPress={handleImport}
            >
              <Text style={{ color: text, fontWeight: '800', fontSize: 14 }}>Import Backup</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={{ backgroundColor: saving ? textMuted : orange, borderRadius: 12, paddingVertical: 16, alignItems: 'center' }}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>{saving ? 'Saving...' : 'Save Settings'}</Text>
        </TouchableOpacity>

        {/* Section 7: About */}
        <View style={{ backgroundColor: card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: border, alignItems: 'center' }}>
          <Text style={{ fontWeight: '800', fontSize: 16, color: text }}>Soostori POS</Text>
          <Text style={{ color: textMuted, fontSize: 12, marginTop: 4 }}>Version 1.0.0</Text>
          <Text style={{ color: textMuted, fontSize: 11, marginTop: 8, textAlign: 'center' }}>Offline-first POS • Built with Expo</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
