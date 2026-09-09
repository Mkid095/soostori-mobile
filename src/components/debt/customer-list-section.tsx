// CustomerListSection — search + list for customers tab
import { useState } from 'react'
import { View, Text, FlatList, TextInput, TouchableOpacity } from 'react-native'
import { useTheme } from '../../hooks/useTheme'
import type { Customer } from '../../lib/types'
import { formatDate } from '../../lib/formatters'

interface Props {
  customers: Customer[]
  onRefresh: () => void
  onAddCustomer: () => void
  onRecordDebt: (customer: Customer) => void
}

export function CustomerListSection({ customers, onRefresh, onAddCustomer, onRecordDebt }: Props) {
  const { bg, card, text, textSecondary: textMuted, border, brand: orange } = useTheme()
  const [search, setSearch] = useState('')

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase()
    return !q || c.name.toLowerCase().includes(q) || c.phone?.toLowerCase().includes(q)
  })

  return (
    <View style={{ flex: 1 }}>
      <View style={{ padding: 12, gap: 8, borderBottomWidth: 1, borderBottomColor: border, backgroundColor: card }}>
        <TextInput
          style={{ borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, borderWidth: 1, backgroundColor: bg, color: text, borderColor: border }}
          placeholder="Search customers..." placeholderTextColor={textMuted}
          value={search} onChangeText={setSearch}
        />
        <TouchableOpacity
          style={{ borderRadius: 10, paddingVertical: 12, alignItems: 'center', borderWidth: 2, borderColor: orange, borderStyle: 'dashed' }}
          onPress={onAddCustomer}
        >
          <Text style={{ color: orange, fontWeight: '800', fontSize: 15 }}>+ Add Customer</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 12, paddingBottom: 88 }}
        renderItem={({ item }) => (
          <View style={{ backgroundColor: card, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: border, flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700', fontSize: 15, color: text }}>{item.name}</Text>
              {item.phone && <Text style={{ fontSize: 12, color: textMuted, marginTop: 2 }}>{item.phone}</Text>}
              <Text style={{ fontSize: 11, color: textMuted, marginTop: 2 }}>Added {formatDate(item.createdAt)}</Text>
            </View>
            <TouchableOpacity
              style={{ backgroundColor: orange, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 }}
              onPress={() => onRecordDebt(item)}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Record Debt</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <View style={{ padding: 60, alignItems: 'center' }}>
            <Text style={{ color: textMuted }}>No customers found</Text>
          </View>
        }
        onRefresh={onRefresh}
        refreshing={false}
      />
    </View>
  )
}
