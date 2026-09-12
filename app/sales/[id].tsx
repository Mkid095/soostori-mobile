// app/sales/[id].tsx — Phase 19: sale detail screen
// Header: sale ID, status, total + line items + payment info + print
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ArrowLeft } from 'lucide-react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useTheme } from '../../src/hooks/useTheme'
import { useSaleDetail } from '../../src/hooks/useSaleDetail'
import { SaleSummaryCard } from './_components/sale-summary-card'
import { SaleLineItems } from './_components/sale-line-items'
import { SalePaymentSection } from './_components/sale-payment-section'

export default function SaleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { bg, card, text, muted, border, brand } = useTheme()
  const router = useRouter()
  const { data: sale, isLoading } = useSaleDetail(id ?? '')

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>
        <SaleHeader router={router} text={text} card={card} border={border} id={id} />
        <View style={styles.loading}><ActivityIndicator color={brand} /></View>
      </SafeAreaView>
    )
  }

  if (!sale) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>
        <SaleHeader router={router} text={text} card={card} border={border} id={id} />
        <View style={styles.empty}><Text style={{ color: muted }}>Sale not found</Text></View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>
      <SaleHeader router={router} text={text} card={card} border={border} id={id} />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <SaleSummaryCard sale={sale} />

        {sale.customerIdNumber && (
          <View style={[styles.customerCard, { backgroundColor: card, borderColor: border }]}>
            <Text style={[styles.customerLabel, { color: muted }]}>Customer</Text>
            <Text style={{ color: text }}>{sale.customerIdNumber}</Text>
          </View>
        )}

        <SaleLineItems items={sale.items ?? []} subtotal={sale.subtotal} />
        <SalePaymentSection sale={sale} />
      </ScrollView>
    </SafeAreaView>
  )
}

function SaleHeader({
  router, text, card, border, id,
}: {
  router: ReturnType<typeof useRouter>
  text: string; card: string; border: string; id?: string
}) {
  return (
    <View style={[styles.header, { backgroundColor: card, borderBottomColor: border }]}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <ArrowLeft size={20} color={text} />
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: text }]} numberOfLines={1}>
        Sale {id?.slice(-6).toUpperCase()}
      </Text>
      <View style={{ width: 36 }} />
    </View>
  )
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 14, borderBottomWidth: 1 },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 17, fontWeight: '800', flex: 1, textAlign: 'center' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  customerCard: { borderRadius: 12, padding: 16, borderWidth: 1, marginBottom: 12 },
  customerLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 },
})
