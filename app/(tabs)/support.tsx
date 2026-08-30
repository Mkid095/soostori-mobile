// app/(tabs)/support.tsx — Support / Help screen
import React from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking } from 'react-native'
import { Mail, Phone, ExternalLink, FileText } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Constants } from 'expo-constants'
import { useQuery } from '@tanstack/react-query'
import { useTheme } from '../../src/hooks/useTheme'
import { AppHeader } from '../../src/components/shared/app-header'
import { FaqItem } from '../../src/components/shared/faq-item'
import { getShopSettings } from '../../src/services/db-settings'
import { colors, spacing, fontSize } from '../../src/lib/theme'

const FAQ_ITEMS = [
  { q: 'How do I add a new product?', a: 'Go to Inventory and tap the + button. Fill in the product details including name, price, barcode, and stock quantity.' },
  { q: 'How do I record a sale?', a: 'On the POS screen, tap products to add them to the cart, then tap Checkout. Choose payment method (Cash or M-Pesa) and confirm.' },
  { q: 'How do I track customer debts?', a: 'Record a sale as "Debt" during checkout. Later, go to the Debt tab to view outstanding balances and record payments.' },
  { q: 'How do I adjust stock levels?', a: 'In Inventory, tap a product and use the stock adjustment option to increase or decrease quantity with a reason.' },
  { q: 'What is the low-stock alert?', a: 'When a product falls below its set threshold, you will receive a notification. Set thresholds in product settings.' },
]

export default function SupportScreen() {
  const insets = useSafeAreaInsets()
  const { bg, card, text, textSecondary, border } = useTheme()
  const appVersion = Constants.expoConfig?.version ?? '1.0.0'
  const buildNumber = Constants.expoConfig?.android?.versionCode ?? 1

  const { data: settings } = useQuery({
    queryKey: ['shop-settings'],
    queryFn: getShopSettings,
  })

  const shopPhone = settings?.phone

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <AppHeader title="Support" showSync={false} showToggle={false} showSettings={false} />

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 80 }} showsVerticalScrollIndicator={false}>

        {/* Contact Us */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: text }]}>Contact Us</Text>
          <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
            <TouchableOpacity style={styles.row} onPress={() => Linking.openURL('mailto:support@soostori.com')}>
              <Mail size={18} color={colors.brand} />
              <Text style={[styles.rowText, { color: text }]}>support@soostori.com</Text>
            </TouchableOpacity>
            <View style={[styles.divider, { backgroundColor: border }]} />
            <TouchableOpacity style={styles.row} onPress={() => shopPhone ? Linking.openURL(`tel:${shopPhone}`) : undefined}>
              <Phone size={18} color={colors.brand} />
              <Text style={[styles.rowText, { color: text }]}>{shopPhone ?? 'No phone configured'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* FAQ */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: text }]}>Frequently Asked Questions</Text>
          {FAQ_ITEMS.map((item, i) => (
            <View key={i} style={{ marginBottom: spacing.sm }}><FaqItem question={item.q} answer={item.a} /></View>
          ))}
        </View>

        {/* Documentation */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: text }]}>Documentation</Text>
          <TouchableOpacity style={[styles.card, { backgroundColor: card, borderColor: border }]} onPress={() => Linking.openURL('https://soostori.com/docs')}>
            <FileText size={18} color={colors.brand} />
            <Text style={[styles.rowText, { color: text }]}>View full documentation</Text>
            <ExternalLink size={16} color={textSecondary} />
          </TouchableOpacity>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: text }]}>About</Text>
          <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
            <View style={styles.row}>
              <Text style={[styles.label, { color: textSecondary }]}>App Version</Text>
              <Text style={[styles.value, { color: text }]}>{appVersion}</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: border }]} />
            <View style={styles.row}>
              <Text style={[styles.label, { color: textSecondary }]}>Build</Text>
              <Text style={[styles.value, { color: text }]}>{buildNumber}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  section: { paddingHorizontal: spacing.lg, marginTop: spacing.xl },
  sectionTitle: { fontSize: fontSize.base, fontWeight: '700', marginBottom: spacing.sm },
  card: { borderRadius: 10, borderWidth: 1, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  rowText: { flex: 1, fontSize: fontSize.base },
  divider: { height: 1 },
  label: { fontSize: fontSize.sm },
  value: { fontSize: fontSize.sm, fontWeight: '600' },
})
