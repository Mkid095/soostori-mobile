// Clients screen — lists customers, search, add/edit, view detail + purchase history.
// Business logic in services; component handles UI state + rendering orchestration.

import { useState, useCallback } from 'react'
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Search, Plus, Users } from 'lucide-react-native'
import { useTheme } from '../../src/hooks/useTheme'
import type { Client } from '../../src/lib/types'
import { useClients } from '../../src/hooks/useClients'
import { AppHeader } from '../../src/components/shared/app-header'
import { ClientDetail } from '../../src/components/clients/client-detail'
import { ClientFormModal } from '../../src/components/clients/client-form-modal'
import { formatDate } from '../../src/lib/formatters'

export default function ClientsScreen() {
  const { bg, card, text, textSecondary: muted, border, brand } = useTheme()
  const [search, setSearch] = useState('')
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editClient, setEditClient] = useState<Client | null>(null)
  const [version, setVersion] = useState(0)

  const { data: clients = [], isLoading } = useClients(search)
  const refresh = useCallback(() => setVersion((v) => v + 1), [])

  if (selectedClient) {
    return (
      <ClientDetail
        client={selectedClient}
        onBack={() => setSelectedClient(null)}
        onEdit={(c) => { setSelectedClient(null); setEditClient(c) }}
        onRefresh={refresh}
      />
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['bottom']}>
      <AppHeader title="Clients" />

      {/* Search + Add */}
      <View style={[headerStyles.searchBar, { backgroundColor: card, borderBottomColor: border }]}>
        <View style={headerStyles.searchRow}>
          <Search size={16} color={muted} />
          <TextInput
            style={[headerStyles.searchInput, { color: text }]}
            placeholder="Search by name or phone..."
            placeholderTextColor={muted}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <TouchableOpacity
          style={[headerStyles.addBtn, { borderColor: brand }]}
          onPress={() => setShowAddModal(true)}
        >
          <Plus size={16} color={brand} />
          <Text style={[headerStyles.addBtnText, { color: brand }]}>Add Client</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={clients}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 12, paddingBottom: 88 }}
        refreshing={isLoading}
        onRefresh={refresh}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[listItemStyles.card, { backgroundColor: card, borderColor: border }]}
            onPress={() => setSelectedClient(item)}
            activeOpacity={0.7}
          >
            <View style={{ flex: 1 }}>
              <Text style={[listItemStyles.name, { color: text }]}>{item.name}</Text>
              {item.phone && <Text style={[listItemStyles.sub, { color: muted }]}>{item.phone}</Text>}
              <Text style={[listItemStyles.sub, { color: muted }]}>Added {formatDate(item.createdAt)}</Text>
            </View>
            <Users size={18} color={muted} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={{ padding: 60, alignItems: 'center', gap: 12 }}>
            <Users size={40} color={muted} />
            <Text style={{ color: muted, fontSize: 14 }}>{search ? 'No clients found' : 'No clients yet'}</Text>
          </View>
        }
      />

      <ClientFormModal
        client={editClient}
        visible={showAddModal || editClient !== null}
        onClose={() => { setShowAddModal(false); setEditClient(null) }}
        onSaved={() => { refresh(); setShowAddModal(false); setEditClient(null) }}
      />
    </SafeAreaView>
  )
}

const headerStyles = StyleSheet.create({
  searchBar: { padding: 12, gap: 8, borderBottomWidth: 1 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchInput: { flex: 1, fontSize: 15 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 10, paddingVertical: 10, borderWidth: 2, borderStyle: 'dashed' },
  addBtnText: { fontWeight: '800', fontSize: 14 },
})

const listItemStyles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1 },
  name: { fontWeight: '700', fontSize: 15 },
  sub: { fontSize: 12, marginTop: 2 },
})
