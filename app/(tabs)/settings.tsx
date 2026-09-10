// app/(tabs)/settings.tsx — Settings page with section cards → full-screen modals
import React, { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert, Modal } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useTheme } from '../../src/hooks/useTheme'
import { useEmployee } from '../../src/hooks/useEmployee'
import {
  Store, Palette, CreditCard, Scan, Printer,
  Database, Info, Shield, LogOut, Wifi, Building2,
} from 'lucide-react-native'

import { SettingsSectionCard } from '../../src/components/settings/settings-section-card'
import { SettingsModal } from '../../src/components/settings/settings-modal'
import { ShopSettingsForm } from '../../src/components/settings/shop-settings-form'
import { AppearanceModalContent } from '../../src/components/settings/appearance-modal-content'
import { PaymentModalContent } from '../../src/components/settings/payment-modal-content'
import { ScannerModalContent } from '../../src/components/settings/scanner-modal-content'
import { PrinterModalContent } from '../../src/components/settings/printer-modal-content'
import { DataManagementSection } from '../../src/components/settings/data-management-section'
import { ChangelogSection } from '../../src/components/settings/changelog-section'
import { PairingRequestsSheet } from '../../src/components/settings/pairing-requests-sheet'
import { JoinShopSheet } from '../../src/components/shared/join-shop-sheet'
import { cloudLogout } from '../../src/services/cloud-auth'
import { APP_VERSION } from '../../src/lib/constants'

// ── Section definitions ─────────────────────────────────────────────────────
interface Section {
  id: string
  icon: React.ReactElement
  title: string
  description: string
}

const SECTIONS: Section[] = [
  { id: 'shop',       icon: <Store size={22} color="#f97316" />, title: 'Shop Details',    description: 'Shop name, address, receipt footer, currency' },
  { id: 'appearance', icon: <Palette size={22} color="#f97316" />, title: 'Appearance',      description: 'Theme, language, display preferences' },
  { id: 'payment',    icon: <CreditCard size={22} color="#f97316" />, title: 'Payment',       description: 'M-Pesa, cash, bank paybill channels' },
  { id: 'scanner',   icon: <Scan size={22} color="#f97316" />,     title: 'Scanner',        description: 'Barcode scanner settings' },
  { id: 'printer',   icon: <Printer size={22} color="#f97316" />,  title: 'Printer',        description: 'Receipt printer configuration' },
  { id: 'lan',       icon: <Wifi size={22} color="#f97316" />,     title: 'Shop Connection', description: 'Connect to shop POS for sync' },
  { id: 'pairing',   icon: <Shield size={22} color="#f97316" />,   title: 'Pairing Requests', description: 'Approve or reject device pairing requests' },
  { id: 'data',      icon: <Database size={22} color="#f97316" />,  title: 'Data Management',description: 'Export, import, and backup data' },
  { id: 'changelog', icon: <Info size={22} color="#f97316" />,     title: 'Changelog',      description: 'Version history and release notes' },
]

const MODAL_CONFIGS: Record<string, { title: string; subtitle: string; icon: React.ReactElement }> = {
  shop:       { title: 'Shop Details',      subtitle: 'Shop info and receipt config',        icon: <Store size={20} color="#fff" /> },
  appearance: { title: 'Appearance',         subtitle: 'Theme and language settings',          icon: <Palette size={20} color="#fff" /> },
  payment:   { title: 'Payment',           subtitle: 'M-Pesa and payment channel setup',    icon: <CreditCard size={20} color="#fff" /> },
  scanner:   { title: 'Scanner',           subtitle: 'Configure barcode scanner',             icon: <Scan size={20} color="#fff" /> },
  printer:   { title: 'Printer',           subtitle: 'Receipt printer setup',               icon: <Printer size={20} color="#fff" /> },
  data:      { title: 'Data Management',   subtitle: 'Backup and restore',                   icon: <Database size={20} color="#fff" /> },
  changelog: { title: 'Changelog',         subtitle: `Version ${APP_VERSION} release notes`,  icon: <Info size={20} color="#fff" /> },
}

// ── Main screen ──────────────────────────────────────────────────────────────
export default function SettingsScreen() {
  const { bg, text, textSecondary, border, brand } = useTheme()
  const { employee } = useEmployee()
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [showJoinShop, setShowJoinShop] = useState(false)
  const [showPairing, setShowPairing] = useState(false)
  const config = activeSection ? MODAL_CONFIGS[activeSection] : null

  const isOwnerOrManager = employee?.role === 'owner' || employee?.role === 'manager'

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

  function handleLanPress() {
    setShowJoinShop(true)
  }

  function handlePairingPress() {
    if (!isOwnerOrManager) {
      Alert.alert('Access Denied', 'Only the shop owner or manager can approve pairing requests.')
      return
    }
    setShowPairing(true)
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
        {/* Business Setup — owner/manager only */}
        {isOwnerOrManager && (
          <SettingsSectionCard
            icon={<Building2 size={22} color="#f97316" />}
            title="Business Setup"
            description="Create or manage your business"
            onPress={() => router.push('/business-setup')}
          />
        )}
        {SECTIONS.map((section) => {
          if (section.id === 'lan') {
            return (
              <SettingsSectionCard
                key={section.id}
                icon={section.icon}
                title={section.title}
                description={section.description}
                onPress={handleLanPress}
              />
            )
          }
          if (section.id === 'pairing') {
            return (
              <SettingsSectionCard
                key={section.id}
                icon={section.icon}
                title={section.title}
                description={section.description}
                onPress={handlePairingPress}
              />
            )
          }
          return (
            <SettingsSectionCard
              key={section.id}
              icon={section.icon}
              title={section.title}
              description={section.description}
              onPress={() => setActiveSection(section.id)}
            />
          )
        })}

        {/* Logout button */}
        <TouchableOpacity
          style={{ marginTop: 16, borderRadius: 12, borderWidth: 1.5, borderColor: '#ef4444', paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
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
          {activeSection === 'shop'       && <ShopSettingsForm onClose={() => setActiveSection(null)} />}
          {activeSection === 'appearance'  && <AppearanceModalContent />}
          {activeSection === 'payment'    && <PaymentModalContent />}
          {activeSection === 'data'       && <DataManagementSection />}
          {activeSection === 'changelog'  && <ChangelogSection />}
          {activeSection === 'scanner'    && <ScannerModalContent onClose={() => setActiveSection(null)} />}
          {activeSection === 'printer'    && <PrinterModalContent onClose={() => setActiveSection(null)} />}
        </SettingsModal>
      )}

      {/* Join Shop Sheet */}
      <JoinShopSheet
        visible={showJoinShop}
        onClose={() => setShowJoinShop(false)}
        onSuccess={() => setShowJoinShop(false)}
      />

      {/* Pairing Requests Sheet */}
      <Modal visible={showPairing} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowPairing(false)}>
        <PairingRequestsSheet onClose={() => setShowPairing(false)} />
      </Modal>
    </SafeAreaView>
  )
}
