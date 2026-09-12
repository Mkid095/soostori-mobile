// app/customers/[id].tsx — Phase 19: customer detail screen
// Tabs: Purchase History | Debt History | Notes
import { useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ArrowLeft, User, Phone, Mail, Calendar } from 'lucide-react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useTheme } from '../../src/hooks/useTheme'
import { useCustomerDetail } from '../../src/hooks/useCustomerDetail'
import { formatCurrency, formatDate } from '../../src/lib/formatters'
import { PurchaseHistory } from './_components/purchase-history'
import { DebtHistory } from './_components/debt-history'
import { NotesTab } from './_components/notes-tab'

type Tab = 'purchases' | 'debts' | 'notes'

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { bg, card, text, muted, border, brand, success, danger } = useTheme()
  const router = useRouter()
  const { data, isLoading } = useCustomerDetail(id ?? '')
  const [tab, setTab] = useState<Tab>('purchases')
  const [noteText, setNoteText] = useState('')

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>
        <CustomerHeader router={router} text={text} card={card} border={border} title="Customer" />
        <View style={styles.loading}><ActivityIndicator color={brand} /></View>
      </SafeAreaView>
    )
  }

  if (!data?.customer) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>
        <CustomerHeader router={router} text={text} card={card} border={border} title="Customer" />
        <View style={styles.empty}><Text style={{ color: muted }}>Customer not found</Text></View>
      </SafeAreaView>
    )
  }

  const { customer, sales, debts, payments } = data
  const totalDebt = debts
    .filter(d => d.status === 'pending' || d.status === 'partial')
    .reduce((sum, d) => sum + d.amount, 0)

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>
      <CustomerHeader router={router} text={text} card={card} border={border} title={customer.name} />

      {/* Customer info card */}
      <View style={[styles.infoCard, { backgroundColor: card, borderColor: border }]}>
        <View style={styles.avatarRow}>
          <View style={[styles.avatar, { backgroundColor: brand + '20' }]}>
            <User size={28} color={brand} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.customerName, { color: text }]}>{customer.name}</Text>
            {customer.phone && (
              <View style={styles.infoRow}>
                <Phone size={13} color={muted} />
                <Text style={[styles.infoText, { color: muted }]}>{customer.phone}</Text>
              </View>
            )}
            {customer.email && (
              <View style={styles.infoRow}>
                <Mail size={13} color={muted} />
                <Text style={[styles.infoText, { color: muted }]}>{customer.email}</Text>
              </View>
            )}
            <View style={styles.infoRow}>
              <Calendar size={13} color={muted} />
              <Text style={[styles.infoText, { color: muted }]}>
                Member since {formatDate(customer.createdAt)}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Tab bar */}
      <View style={[styles.tabBar, { backgroundColor: card, borderBottomColor: border }]}>
        {(['purchases', 'debts', 'notes'] as Tab[]).map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && { borderBottomColor: brand, borderBottomWidth: 2 }]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, { color: tab === t ? brand : muted }]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab content */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {tab === 'purchases' && <PurchaseHistory sales={sales} />}
        {tab === 'debts' && (
          <DebtHistory debts={debts} payments={payments} totalDebt={totalDebt} />
        )}
        {tab === 'notes' && (
          <NotesTab notes={noteText} onSave={setNoteText} />
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function CustomerHeader({
  router, text, card, border, title,
}: {
  router: ReturnType<typeof useRouter>
  text: string; card: string; border: string; title: string
}) {
  return (
    <View style={[styles.header, { backgroundColor: card, borderBottomColor: border }]}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <ArrowLeft size={20} color={text} />
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: text }]} numberOfLines={1}>{title}</Text>
      <View style={{ width: 36 }} />
    </View>
  )
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 14, borderBottomWidth: 1 },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 17, fontWeight: '800', flex: 1, textAlign: 'center' },
  infoCard: { margin: 16, marginBottom: 0, borderRadius: 12, padding: 16, borderWidth: 1 },
  avatarRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  avatar: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  customerName: { fontSize: 17, fontWeight: '800', marginBottom: 4 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  infoText: { fontSize: 13 },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabText: { fontSize: 14, fontWeight: '700' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
})
