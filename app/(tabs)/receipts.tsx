// app/(tabs)/receipts.tsx — Recent sales / receipt history
import { useState, useEffect, useCallback } from 'react'
import { View, Text, FlatList, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Receipt, ChevronRight } from 'lucide-react-native'
import type { ReceiptHistoryItem } from '../../src/services/db-sales'
import { getReceiptHistory } from '../../src/services/db-sales'
import { formatCurrency } from '../../src/lib/formatters'
import { useTheme } from '../../src/hooks/useTheme'
import { AppHeader } from '../../src/components/shared/app-header'

export default function ReceiptsScreen() {
  const { bg, card, text, textSecondary: textMuted, border, brand } = useTheme()
  const [receipts, setReceipts] = useState<ReceiptHistoryItem[]>([])

  useEffect(() => { getReceiptHistory(100).then(setReceipts) }, [])

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['bottom']}>
      <AppHeader title="Receipts" />
      <FlatList
        data={receipts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={{ backgroundColor: card, borderRadius: 10, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: border, flexDirection: 'row', alignItems: 'center' }}>
            <Receipt size={20} color={brand} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ fontWeight: '700', color: text, fontSize: 14 }}>{item.receiptNumber}</Text>
              <Text style={{ color: textMuted, fontSize: 12, marginTop: 2 }}>{item.date}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontWeight: '800', color: text, fontSize: 15 }}>{formatCurrency(item.total)}</Text>
              <Text style={{ color: textMuted, fontSize: 11, marginTop: 2, textTransform: 'capitalize' }}>{item.paymentMethod}</Text>
            </View>
            <ChevronRight size={16} color={textMuted} style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={{ padding: 60, alignItems: 'center' }}>
            <Receipt size={48} color={textMuted} />
            <Text style={{ color: textMuted, fontSize: 15, marginTop: 12 }}>No receipts yet</Text>
          </View>
        }
      />
    </SafeAreaView>
  )
}
