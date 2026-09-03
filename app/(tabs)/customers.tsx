// app/(tabs)/customers.tsx — Search and add customers
// Uses the canonical db-customers service.
import { useState, useEffect, useCallback } from 'react'
import { View, Text, FlatList, TextInput, TouchableOpacity, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Search, UserPlus, Phone, X } from 'lucide-react-native'
import type { Customer } from '../../src/lib/types'
import { getAllCustomers, searchCustomers, createCustomer } from '../../src/services/db-customers'
import { useTheme } from '../../src/hooks/useTheme'
import { AppHeader } from '../../src/components/shared/app-header'

export default function CustomersScreen() {
  const { bg, card, text, textSecondary: textMuted, border, brand } = useTheme()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [query, setQuery] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')

  const load = useCallback(async () => {
    setCustomers(query ? await searchCustomers(query) : await getAllCustomers())
  }, [query])

  useEffect(() => { load() }, [load])

  async function handleAdd() {
    if (!newName.trim()) { Alert.alert('Error', 'Name is required'); return }
    await createCustomer({ name: newName.trim(), phone: newPhone.trim() || undefined })
    setNewName(''); setNewPhone(''); setShowAdd(false); load()
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['bottom']}>
      <AppHeader title="Customers" />

      {/* Search */}
      <View style={{ padding: 12, gap: 8 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: card, borderRadius: 10, paddingHorizontal: 14, borderWidth: 1, borderColor: border }}>
            <Search size={16} color={textMuted} />
            <TextInput style={{ flex: 1, paddingVertical: 10, fontSize: 15, color: text, marginLeft: 8 }} placeholder="Search customers..." placeholderTextColor={textMuted} value={query} onChangeText={setQuery} />
            {query.length > 0 && <TouchableOpacity onPress={() => setQuery('')}><X size={16} color={textMuted} /></TouchableOpacity>}
          </View>
          <TouchableOpacity style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: brand, justifyContent: 'center', alignItems: 'center' }} onPress={() => setShowAdd(true)}>
            <UserPlus size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Add form */}
        {showAdd && (
          <View style={{ backgroundColor: card, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: border, gap: 8 }}>
            <TextInput style={{ backgroundColor: bg, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: text, borderWidth: 1, borderColor: border }} placeholder="Full name" placeholderTextColor={textMuted} value={newName} onChangeText={setNewName} />
            <TextInput style={{ backgroundColor: bg, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: text, borderWidth: 1, borderColor: border }} placeholder="Phone (optional)" placeholderTextColor={textMuted} value={newPhone} onChangeText={setNewPhone} keyboardType="phone-pad" />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity style={{ flex: 1, backgroundColor: brand, paddingVertical: 10, borderRadius: 8, alignItems: 'center' }} onPress={handleAdd}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Add Customer</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: bg, borderWidth: 1, borderColor: border }} onPress={() => setShowAdd(false)}>
                <Text style={{ color: text }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      <FlatList
        data={customers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
        renderItem={({ item }) => (
          <View style={{ backgroundColor: card, borderRadius: 10, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: border, flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700', color: text, fontSize: 15 }}>{item.name}</Text>
              {item.phone && <Text style={{ color: textMuted, fontSize: 13, marginTop: 2 }}>{item.phone}</Text>}
            </View>
          </View>
        )}
        ListEmptyComponent={<View style={{ padding: 40, alignItems: 'center' }}><Text style={{ color: textMuted }}>No customers found</Text></View>}
      />
    </SafeAreaView>
  )
}
