// app/(tabs)/settings.tsx — Settings page with section cards → full-screen modals
import React, { useState, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useTheme, useAppTheme } from '../../src/hooks/useTheme'
import {
  Store, Palette, CreditCard, Scan, Printer,
  Database, Info, Shield, Sun, Moon, LogOut,
} from 'lucide-react-native'

import { SettingsSectionCard } from '../../src/components/settings/settings-section-card'
import { SettingsModal } from '../../src/components/settings/settings-modal'
import { PaymentChannelsSection } from '../../src/components/settings/payment-channels-section'
import { DataManagementSection } from '../../src/components/settings/data-management-section'
import { ScannerSection } from '../../src/components/settings/scanner-section'
import { PrinterSection } from '../../src/components/settings/printer-section'
import { ChangelogSection } from '../../src/components/settings/changelog-section'
import { UpdateChecker, checkForUpdate } from '../../src/components/settings/update-checker'
import { getShopSettings } from '../../src/services/db-settings'
import { cloudLogout } from '../../src/services/cloud-auth'
import { APP_VERSION } from '../../src/lib/constants'
import type { ShopSettings } from '../../src/lib/types'

// ── Section definitions ─────────────────────────────────────────────────────
interface Section {
  id: string
  icon: React.ReactElement
  title: string
  description: string
  badge?: string
}

const SECTIONS: Section[] = [

  { id: 'shop',        icon: <Store size={22} color="#f97316" />, title: 'Shop Details',       description: 'Shop name, address, receipt footer, currency' },

  { id: 'appearance',  icon: <Palette size={22} color="#f97316" />, title: 'Appearance',         description: 'Theme, language, display preferences' },

  { id: 'payment',     icon: <CreditCard size={22} color="#f97316" />, title: 'Payment',          description: 'M-Pesa, cash, bank paybill channels' },

  { id: 'scanner',    icon: <Scan size={22} color="#f97316" />,     title: 'Scanner',           description: 'Barcode scanner settings' },

  { id: 'printer',    icon: <Printer size={22} color="#f97316" />,   title: 'Printer',           description: 'Receipt printer configuration' },

  { id: 'data',       icon: <Database size={22} color="#f97316" />,  title: 'Data Management',   description: 'Export, import, and backup data' },

  { id: 'changelog',  icon: <Info size={22} color="#f97316" />,     title: 'Changelog',         description: 'Version history and release notes' },
]

const MODAL_CONFIGS: Record<string, { title: string; subtitle: string; icon: React.ReactElement }> = {

  shop:       { title: 'Shop Details',      subtitle: 'Shop info and receipt config',       icon: <Store size={20} color="#fff" /> },

  appearance: { title: 'Appearance',         subtitle: 'Theme and language settings',         icon: <Palette size={20} color="#fff" /> },

  payment:    { title: 'Payment',           subtitle: 'M-Pesa and payment channel setup',   icon: <CreditCard size={20} color="#fff" /> },

  scanner:    { title: 'Scanner',           subtitle: 'Configure barcode scanner',            icon: <Scan size={20} color="#fff" /> },

  printer:    { title: 'Printer',           subtitle: 'Receipt printer setup',               icon: <Printer size={20} color="#fff" /> },

  data:       { title: 'Data Management',   subtitle: 'Backup and restore',                 icon: <Database size={20} color="#fff" /> },

  changelog:  { title: 'Changelog',        subtitle: `Version ${APP_VERSION} release notes`,icon: <Info size={20} color="#fff" /> },
}

// ── Main screen ──────────────────────────────────────────────────────────────
export default function SettingsScreen() {
  const { bg, text, textSecondary, border, brand } = useTheme()
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const config = activeSection ? MODAL_CONFIGS[activeSection] : null

  async function handleLogout() {
    Alert.alert(
      'Sign out?',
      'You will need to sign in again to use Soostori POS.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: async () => {
            try {
              await cloudLogout()
              router.replace('/welcome')
            } catch {
              Alert.alert('Sign out failed', 'Please try again.')
            }
          },
        },
      ]
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['bottom']}>
      {/* Page header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: border, gap: 12 }}>
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: brand, justifyContent: 'center', alignItems: 'center' }}>

          <Shield size={18} color="#fff" />
        </View>
        <View>
          <Text style={{ fontSize: 16, fontWeight: '700', color: text }}>Settings</Text>
          <Text style={{ fontSize: 12, color: textSecondary }}>Configure your shop</Text>
        </View>
      </View>

      {/* Section cards */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 88 }} showsVerticalScrollIndicator={false}>
        {SECTIONS.map((section) => (
          <SettingsSectionCard
            key={section.id}
            icon={section.icon}
            title={section.title}
            description={section.description}
            badge={section.badge}
            badgeColor={section.id === 'shop' ? '#fee2e2' : undefined}
            onPress={() => setActiveSection(section.id)}
          />
        ))}

        {/* Logout button */}
        <TouchableOpacity
          style={{
            marginTop: 16,
            borderRadius: 12,
            borderWidth: 1.5,
            borderColor: '#ef4444',
            paddingVertical: 14,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
          onPress={handleLogout}
        >
          <LogOut size={18} color="#ef4444" />
          <Text style={{ color: '#ef4444', fontWeight: '800', fontSize: 15 }}>Sign Out</Text>
        </TouchableOpacity>

        {/* Version footer */}
        <View style={{ alignItems: 'center', paddingVertical: 20, borderTopWidth: 1, borderTopColor: border, marginTop: 8 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: text }}>Soostori POS</Text>
          <Text style={{ fontSize: 11, color: textSecondary, marginTop: 3 }}>Version {APP_VERSION}</Text>
        </View>
      </ScrollView>

      {/* Settings Modal */}
      {activeSection && config && (
        <SettingsModal visible={true} title={config.title} subtitle={config.subtitle} icon={config.icon} onClose={() => setActiveSection(null)}>
          {activeSection === 'shop'       && <ShopSettingsModalContent onClose={() => setActiveSection(null)} />}
          {activeSection === 'appearance'  && <AppearanceModalContent />}
          {activeSection === 'payment'    && <PaymentModalContent />}
          {activeSection === 'data'       && <DataManagementSection />}
          {activeSection === 'changelog'  && <ChangelogSection />}
          {activeSection === 'scanner'    && <ScannerModalContent />}
          {activeSection === 'printer'    && <PrinterModalContent />}
        </SettingsModal>
      )}
    </SafeAreaView>
  )
}

// ── Modal content components ─────────────────────────────────────────────────

function ShopSettingsModalContent({ onClose }: { onClose: () => void }) {
  const { text, textSecondary, card: cardBg, border, brand } = useTheme()
  const [shopName, setShopName] = useState('My Shop')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [lowStock, setLowStock] = useState('10')
  const [footer, setFooter] = useState('')
  const inputStyle = { backgroundColor: cardBg, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: text, borderWidth: 1, borderColor: border }

  return (
    <View style={{ gap: 16 }}>
      <View style={{ backgroundColor: cardBg, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: border }}>
        <Text style={{ fontSize: 15, fontWeight: '800', color: text, marginBottom: 14 }}>Shop Details</Text>
        <View style={{ gap: 12 }}>
          {[
            { label: 'Shop Name',       value: shopName,  set: setShopName,  placeholder: 'My Shop' },
            { label: 'Address',         value: address,   set: setAddress,   placeholder: '123 Main Street, City' },
            { label: 'Phone',          value: phone,     set: setPhone,     placeholder: '+254 700 000 000' },
            { label: 'Low Stock Alert', value: lowStock, set: setLowStock,  placeholder: '10' },
          ].map(({ label, value, set, placeholder }) => (
            <View key={label}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: textSecondary, marginBottom: 6 }}>{label}</Text>
              <TextInput style={inputStyle} value={value} onChangeText={set} placeholder={placeholder} placeholderTextColor={textSecondary} />
            </View>
          ))}
        </View>
      </View>

      <View style={{ backgroundColor: cardBg, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: border }}>
        <Text style={{ fontSize: 15, fontWeight: '800', color: text, marginBottom: 14 }}>Receipt</Text>
        <Text style={{ fontSize: 12, fontWeight: '700', color: textSecondary, marginBottom: 6 }}>Footer Message</Text>
        <TextInput style={{ ...inputStyle, marginBottom: 0 }} value={footer} onChangeText={setFooter} placeholder="Thank you for shopping!" placeholderTextColor={textSecondary} />
      </View>

      <TouchableOpacity style={{ backgroundColor: brand, borderRadius: 12, paddingVertical: 16, alignItems: 'center' }} onPress={onClose}>
        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>Save Settings</Text>
      </TouchableOpacity>
    </View>
  )
}

function AppearanceModalContent() {
  const { effectiveScheme, toggleScheme } = useAppTheme()
  const { text, textSecondary, border, card: cardBg, brand } = useTheme()

  return (
    <View style={{ gap: 20 }}>
      <View>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>

          <Sun size={16} color={brand} style={{ marginRight: 6 }} />
          <Text style={{ fontSize: 13, fontWeight: '700', color: text }}>Default Theme</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity
            onPress={() => effectiveScheme === 'dark' && toggleScheme()}
            style={{
              flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5,
              borderColor: effectiveScheme === 'light' ? brand : border,
              backgroundColor: effectiveScheme === 'light' ? cardBg : 'transparent',
              alignItems: 'center',
            }}
          >

            <Sun size={16} color={effectiveScheme === 'light' ? brand : textSecondary} />
            <Text style={{ fontSize: 12, fontWeight: '600', color: effectiveScheme === 'light' ? brand : textSecondary, marginTop: 4 }}>Light</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => effectiveScheme === 'light' && toggleScheme()}
            style={{
              flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5,
              borderColor: effectiveScheme === 'dark' ? brand : border,
              backgroundColor: effectiveScheme === 'dark' ? cardBg : 'transparent',
              alignItems: 'center',
            }}
          >

            <Moon size={16} color={effectiveScheme === 'dark' ? brand : textSecondary} />
            <Text style={{ fontSize: 12, fontWeight: '600', color: effectiveScheme === 'dark' ? brand : textSecondary, marginTop: 4 }}>Dark</Text>
          </TouchableOpacity>
        </View>
        <Text style={{ fontSize: 11, color: textSecondary, marginTop: 8 }}>Applied to all screens when app starts</Text>
      </View>
    </View>
  )
}

function PaymentModalContent() {
  const { text, textSecondary } = useTheme()
  const [settings, setSettings] = useState<ShopSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    getShopSettings()
      .then(s => { setSettings(s); setLoading(false) })
      .catch(e => { setError(String(e)); setLoading(false) })
  }, [])

  if (loading) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 40 }}>
        <Text style={{ color: textSecondary, fontSize: 14 }}>Loading…</Text>
      </View>
    )
  }
  if (error || !settings) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 40 }}>
        <Text style={{ color: '#ef4444', fontSize: 13, textAlign: 'center', paddingHorizontal: 20 }}>
          Could not load payment settings.{'\n'}{error}
        </Text>
      </View>
    )
  }
  return <PaymentChannelsSection settings={settings} />
}

function ScannerModalContent() {
  const { card, text, textSecondary, border } = useTheme()
  const [useBluetooth, setUseBluetooth] = useState(false)
  return <ScannerSection useBluetoothScanner={useBluetooth} onBluetoothToggle={setUseBluetooth} />
}

function PrinterModalContent() {
  const [printerType, setPrinterType] = useState<'wifi' | 'bluetooth' | 'pdf'>('pdf')
  return <PrinterSection printerType={printerType} onPrinterTypeChange={setPrinterType} />
}
