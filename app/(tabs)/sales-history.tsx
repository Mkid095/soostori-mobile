// Sales History — full list of all historical sales with search, filters, and pagination
import { useState, useEffect, useCallback } from 'react'
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { FileText, Search, Printer } from 'lucide-react-native'
import { useTheme } from '../../src/hooks/useTheme'
import type { Sale } from '../../src/lib/types'
import { getAllSales } from '../../src/services/db-sales'
import { SaleRow } from '../../src/components/reports/sale-row'
import { SaleDetailModal } from '../../src/components/reports/sale-detail-modal'
import { PaymentFilterRow } from '../../src/components/reports/filter-row'
import { AppHeader } from '../../src/components/shared/app-header'

type PaymentFilter = 'all' | 'cash' | 'mpesa' | 'debt'

const PAGE_SIZE = 50

export default function SalesHistoryScreen() {
  const { bg, card, text, textSecondary: muted, border, brand } = useTheme()
  const [allSales, setAllSales] = useState<Sale[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all')
  const [page, setPage] = useState(1)
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [detailVisible, setDetailVisible] = useState(false)
  const [loading, setLoading] = useState(false)

  const loadAllSales = useCallback(async () => {
    setLoading(true)
    try {
      const sales = await getAllSales()
      setAllSales(sales)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadAllSales() }, [loadAllSales])

  const filteredSales = allSales.filter((s) => {
    // Payment filter
    if (paymentFilter === 'mpesa' && s.paymentMethod !== 'mpesa' && s.paymentMethod !== 'mobile_money') return false
    if (paymentFilter === 'cash' && s.paymentMethod !== 'cash') return false
    if (paymentFilter === 'debt' && s.paymentMethod !== 'debt') return false
    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchId = s.id.toLowerCase().includes(q)
      const matchCustomer = (s.customerIdNumber ?? '').toLowerCase().includes(q)
      const matchNote = (s.note ?? '').toLowerCase().includes(q)
      if (!matchId && !matchCustomer && !matchNote) return false
    }
    return true
  })

  const displayedSales = filteredSales.slice(0, page * PAGE_SIZE)
  const hasMore = displayedSales.length < filteredSales.length

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['bottom']}>
      <AppHeader title="Sales History" />

      {/* Search bar */}
      <View style={[styles.searchRow, { backgroundColor: card, borderBottomColor: border }]}>
        <View style={[styles.searchBox, { backgroundColor: bg, borderColor: border }]}>
          <Search size={16} color={muted} />
          <TextInput
            style={[styles.searchInput, { color: text }]}
            placeholder="Search receipt, customer ID, note..."
            placeholderTextColor={muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <PaymentFilterRow value={paymentFilter} onChange={setPaymentFilter} />

      {/* Results count */}
      <View style={[styles.resultsRow, { borderBottomColor: border }]}>
        <Text style={[styles.resultsText, { color: muted }]}>
          {filteredSales.length} transaction{filteredSales.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <FlatList
        data={displayedSales}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 100 }}
        onEndReached={() => hasMore && setPage((p) => p + 1)}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          <View style={[styles.empty, { backgroundColor: card, borderColor: border }]}>
            <FileText size={32} color={muted} />
            <Text style={[styles.emptyText, { color: muted }]}>No transactions found</Text>
          </View>
        }
        renderItem={({ item }) => (
          <SaleRow
            sale={item}
            onPress={() => { setSelectedSale(item); setDetailVisible(true) }}
          />
        )}
        ListFooterComponent={
          hasMore ? (
            <TouchableOpacity
              style={[styles.loadMore, { borderColor: brand }]}
              onPress={() => setPage((p) => p + 1)}
            >
              <Text style={[styles.loadMoreText, { color: brand }]}>Load More</Text>
            </TouchableOpacity>
          ) : displayedSales.length > 0 ? (
            <Text style={[styles.endText, { color: muted }]}>— end of results —</Text>
          ) : null
        }
      />

      <SaleDetailModal
        sale={selectedSale}
        visible={detailVisible}
        onClose={() => setDetailVisible(false)}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  searchRow: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, height: 42 },
  searchInput: { flex: 1, fontSize: 15 },
  resultsRow: { paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1 },
  resultsText: { fontSize: 12, fontWeight: '600' },
  empty: { marginHorizontal: 12, marginTop: 20, padding: 40, borderRadius: 12, borderWidth: 1, alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 14, fontWeight: '600' },
  loadMore: { marginHorizontal: 12, marginTop: 12, paddingVertical: 14, borderRadius: 10, borderWidth: 1.5, alignItems: 'center' },
  loadMoreText: { fontSize: 14, fontWeight: '700' },
  endText: { textAlign: 'center', paddingVertical: 16, fontSize: 12 },
})
