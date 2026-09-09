// ClientDetail — purchase history view for a single client.
// Pure presentation: receives data via props, emits events.

import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native'
import { ArrowLeft, Phone, Mail, Users, X } from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import type { Client, Sale } from '../../lib/types'
import { useClientPurchaseHistory } from '../../hooks/useClients'
import { deleteClient } from '../../services/db-clients'
import { formatCurrency, formatDate } from '../../lib/formatters'

interface Props {
  client: Client
  onBack: () => void
  onEdit: (client: Client) => void
  onRefresh: () => void
}

export function ClientDetail({ client, onBack, onEdit, onRefresh }: Props) {
  const { bg, card, text, textSecondary: muted, border, brand, danger } = useTheme()
  const { data: purchases } = useClientPurchaseHistory(client.idNumber)

  async function handleDelete() {
    await deleteClient(client.id)
    onRefresh()
    onBack()
  }

  const totalSpent = purchases?.reduce((sum, s) => sum + s.totalAmount, 0) ?? 0

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: card, borderBottomColor: border }]}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <ArrowLeft size={20} color={text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: text }]} numberOfLines={1}>{client.name}</Text>
        <TouchableOpacity onPress={() => onEdit(client)}>
          <Text style={{ color: brand, fontWeight: '700', fontSize: 14 }}>Edit</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={purchases ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        ListHeaderComponent={
          <View style={{ gap: 12 }}>
            {/* Contact info */}
            <View style={[s.infoCard, { backgroundColor: card, borderColor: border }]}>
              {client.phone && (
                <View style={s.infoRow}>
                  <Phone size={15} color={muted} />
                  <Text style={[s.infoText, { color: text }]}>{client.phone}</Text>
                </View>
              )}
              {client.idNumber && (
                <View style={s.infoRow}>
                  <Mail size={15} color={muted} />
                  <Text style={[s.infoText, { color: text }]}>{client.idNumber}</Text>
                </View>
              )}
              <View style={s.infoRow}>
                <Users size={15} color={muted} />
                <Text style={[s.infoText, { color: muted }]}>Customer since {formatDate(client.createdAt)}</Text>
              </View>
            </View>

            {/* Summary */}
            <View style={[s.summaryCard, { backgroundColor: brand + '15', borderColor: brand + '30' }]}>
              <Text style={{ color: muted, fontSize: 12, fontWeight: '700' }}>TOTAL SPENT</Text>
              <Text style={{ color: brand, fontSize: 28, fontWeight: '800' }}>{formatCurrency(totalSpent)}</Text>
              <Text style={{ color: muted, fontSize: 12 }}>{purchases?.length ?? 0} purchase{purchases?.length !== 1 ? 's' : ''}</Text>
            </View>

            <Text style={[s.sectionTitle, { color: text }]}>Purchase History</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[s.purchaseRow, { backgroundColor: card, borderColor: border }]}>
            <View>
              <Text style={{ color: text, fontWeight: '700', fontSize: 14 }}>{formatDate(item.createdAt)}</Text>
              <Text style={{ color: muted, fontSize: 12, marginTop: 2 }}>{item.items_summary}</Text>
            </View>
            <Text style={{ color: text, fontWeight: '800', fontSize: 15 }}>{formatCurrency(item.totalAmount)}</Text>
          </View>
        )}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 40, gap: 8 }}>
            <Users size={36} color={muted} />
            <Text style={{ color: muted }}>No purchase history</Text>
          </View>
        }
        ListFooterComponent={
          purchases && purchases.length > 0 ? (
            <TouchableOpacity style={[s.deleteBtn, { borderColor: danger }]} onPress={handleDelete}>
              <Text style={{ color: danger, fontWeight: '700' }}>Delete Client</Text>
            </TouchableOpacity>
          ) : null
        }
      />
    </View>
  )
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1 },
  backBtn: { padding: 8, marginRight: 8 },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '800' },
  infoCard: { borderRadius: 12, padding: 14, borderWidth: 1, gap: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoText: { fontSize: 14 },
  summaryCard: { borderRadius: 12, padding: 16, borderWidth: 1, alignItems: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '800', marginTop: 8 },
  purchaseRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 10, padding: 12, borderWidth: 1, marginBottom: 8 },
  deleteBtn: { marginTop: 24, borderWidth: 2, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
})
