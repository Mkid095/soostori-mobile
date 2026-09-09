// Debt/Customer payment panel for PosCheckoutModal
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native'
import { Search, Plus, User, X } from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import { useDebtCustomerSearch } from '../../hooks/useDebtCustomerSearch'

interface Props {
  onBack: () => void
}

export function DebtPaymentPanel({ onBack }: Props) {
  const { card, text, textSecondary, border, brand, bg } = useTheme()
  const {
    customerSearch, setCustomerSearch,
    customerResults, selectedCustomer, setSelectedCustomer,
    newCustomerName, setNewCustomerName,
    newCustomerPhone, setNewCustomerPhone,
    newCustomerId, setNewCustomerId,
    showNewCustomer, setShowNewCustomer,
    isCreatingCustomer, handleCreateCustomer,
    handleClearCustomer,
  } = useDebtCustomerSearch()

  return (
    <View style={s.container}>
      <TouchableOpacity style={s.backBtn} onPress={onBack}>
        <Text style={s.backBtnText}>← Back</Text>
      </TouchableOpacity>

      <Text style={s.sectionTitle}>Debt / credit Sale</Text>

      {selectedCustomer ? (
        <View style={[s.selectedCust, { backgroundColor: card, borderColor: brand }]}>
          <User size={16} color={brand} />
          <View style={{ flex: 1 }}>
            <Text style={[s.custName, { color: text }]}>{selectedCustomer.name}</Text>
            {selectedCustomer.phone && <Text style={[s.custMeta, { color: textSecondary }]}>{selectedCustomer.phone}</Text>}
            {selectedCustomer.idNumber && <Text style={[s.custMeta, { color: textSecondary }]}>ID: {selectedCustomer.idNumber}</Text>}
          </View>
          <TouchableOpacity onPress={handleClearCustomer}><X size={16} color={textSecondary} /></TouchableOpacity>
        </View>
      ) : showNewCustomer ? (
        <View style={[s.newCustForm, { backgroundColor: card, borderColor: border }]}>
          <Text style={[s.formTitle, { color: text }]}>New Customer</Text>
          <TextInput style={[s.tinput, { backgroundColor: bg, borderColor: border, color: text }]} placeholder="Full Name *" placeholderTextColor={textSecondary} value={newCustomerName} onChangeText={setNewCustomerName} />
          <TextInput style={[s.tinput, { backgroundColor: bg, borderColor: border, color: text }]} placeholder="Phone Number *" placeholderTextColor={textSecondary} keyboardType="phone-pad" value={newCustomerPhone} onChangeText={setNewCustomerPhone} />
          <TextInput style={[s.tinput, { backgroundColor: bg, borderColor: border, color: text }]} placeholder="ID Number (optional)" placeholderTextColor={textSecondary} value={newCustomerId} onChangeText={setNewCustomerId} />
          <View style={s.formRow}>
            <TouchableOpacity style={[s.cancelBtn, { borderColor: border }]} onPress={() => setShowNewCustomer(false)}>
              <Text style={[s.cancelBtnText, { color: text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.saveBtn, { backgroundColor: brand }]} onPress={handleCreateCustomer} disabled={isCreatingCustomer}>
              <Text style={s.saveBtnText}>{isCreatingCustomer ? 'Creating...' : 'Create & Use'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <>
          <View style={[s.searchBox, { backgroundColor: card, borderColor: border }]}>
            <Search size={16} color={textSecondary} />
            <TextInput style={[s.searchInput, { color: text }]} placeholder="Search customer by name, phone, or ID..." placeholderTextColor={textSecondary} value={customerSearch} onChangeText={setCustomerSearch} />
          </View>

          {customerResults.map((c) => (
            <TouchableOpacity key={c.id} style={[s.custRow, { backgroundColor: card, borderColor: border }]} onPress={() => setSelectedCustomer(c)}>
              <User size={14} color={textSecondary} />
              <View style={{ flex: 1 }}>
                <Text style={[s.custName, { color: text }]}>{c.name}</Text>
                <Text style={[s.custMeta, { color: textSecondary }]}>{c.phone || 'No phone'} {c.idNumber ? `• ${c.idNumber}` : ''}</Text>
              </View>
              <Plus size={16} color={brand} />
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={[s.addCustBtn, { borderColor: brand }]} onPress={() => setShowNewCustomer(true)}>
            <Plus size={14} color={brand} />
            <Text style={[s.addCustBtnText, { color: brand }]}>Add New Customer</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  )
}

const s = StyleSheet.create({
  container: { gap: 12 },
  backBtn: { borderWidth: 1, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, alignSelf: 'flex-start' },
  backBtnText: { fontSize: 13, fontWeight: '600' },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  selectedCust: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 12, padding: 12, gap: 10 },
  custName: { fontSize: 14, fontWeight: '700' },
  custMeta: { fontSize: 11, marginTop: 2 },
  newCustForm: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 8 },
  formTitle: { fontSize: 14, fontWeight: '700' },
  tinput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  formRow: { flexDirection: 'row', gap: 8 },
  cancelBtn: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  cancelBtnText: { fontSize: 13, fontWeight: '700' },
  saveBtn: { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  searchBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, gap: 8 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14 },
  custRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, padding: 12, gap: 10, marginBottom: 6 },
  addCustBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, justifyContent: 'center' },
  addCustBtnText: { fontSize: 13, fontWeight: '700' },
})
