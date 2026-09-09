// ExpenseFormModal — add/edit expense form.
// Pure presentation: emits save/cancel events.

import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, Alert, ScrollView } from 'react-native'
import { X } from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import type { Expense, ExpenseCategory } from '../../lib/types'
import { createExpense, updateExpense } from '../../services/db-expenses'
import { ExpenseFormCategoryPicker } from './expense-form-category-picker'

interface Props {
  expense?: Expense | null
  categories: ExpenseCategory[]
  visible: boolean
  onClose: () => void
  onSaved: () => void
}

export function ExpenseFormModal({ expense, categories, visible, onClose, onSaved }: Props) {
  const { bg, card, text, border, brand } = useTheme()
  const [catId, setCatId] = useState(expense?.categoryId ?? '')
  const [amount, setAmount] = useState(expense ? String(expense.amount) : '')
  const [desc, setDesc] = useState(expense?.description ?? '')
  const [ref, setRef] = useState(expense?.reference ?? '')
  const [date, setDate] = useState(expense?.date ?? new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)
  const [showPicker, setShowPicker] = useState(false)

  async function handleSave() {
    const amt = parseFloat(amount)
    if (!catId) { Alert.alert('Required', 'Please select a category.'); return }
    if (isNaN(amt) || amt <= 0) { Alert.alert('Required', 'Please enter a valid amount.'); return }
    setSaving(true)
    try {
      if (expense?.id) {
        await updateExpense(expense.id, { categoryId: catId, amount: amt, description: desc.trim() || undefined, reference: ref.trim() || undefined, date })
      } else {
        await createExpense({ categoryId: catId, amount: amt, description: desc.trim() || undefined, reference: ref.trim() || undefined, date })
      }
      onSaved()
      onClose()
    } catch {
      Alert.alert('Error', 'Failed to save expense.')
    } finally {
      setSaving(false)
    }
  }

  const selCat = categories.find((c) => c.id === catId)

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={[s.sheet, { backgroundColor: card }]}>
          <View style={[s.header, { borderBottomColor: border }]}>
            <Text style={[s.title, { color: text }]}>{expense?.id ? 'Edit Expense' : 'Add Expense'}</Text>
            <TouchableOpacity onPress={onClose}><X size={20} color={text} /></TouchableOpacity>
          </View>

          <ScrollView style={s.fields} keyboardShouldPersistTaps="handled">
            <Text style={[s.label, { color: text }]}>Category *</Text>
            <TouchableOpacity style={[s.picker, { backgroundColor: bg, borderColor: border }]} onPress={() => setShowPicker(true)}>
              {selCat ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: selCat.color }} />
                  <Text style={{ color: text, fontSize: 15 }}>{selCat.name}</Text>
                </View>
              ) : (
                <Text style={{ color: '#94A3B8', fontSize: 15 }}>Select category</Text>
              )}
            </TouchableOpacity>

            <Text style={[s.label, { color: text }]}>Amount *</Text>
            <TextInput style={[s.input, { backgroundColor: bg, color: text, borderColor: border }]}
              placeholder="0.00" placeholderTextColor="#94A3B8" keyboardType="decimal-pad"
              value={amount} onChangeText={setAmount} />

            <Text style={[s.label, { color: text }]}>Date *</Text>
            <TextInput style={[s.input, { backgroundColor: bg, color: text, borderColor: border }]}
              placeholder="YYYY-MM-DD" placeholderTextColor="#94A3B8"
              value={date} onChangeText={setDate} />

            <Text style={[s.label, { color: text }]}>Description</Text>
            <TextInput style={[s.input, { backgroundColor: bg, color: text, borderColor: border }]}
              placeholder="What was this expense for?" placeholderTextColor="#94A3B8"
              value={desc} onChangeText={setDesc} />

            <Text style={[s.label, { color: text }]}>Reference / Receipt #</Text>
            <TextInput style={[s.input, { backgroundColor: bg, color: text, borderColor: border }]}
              placeholder="Optional" placeholderTextColor="#94A3B8"
              value={ref} onChangeText={setRef} />
          </ScrollView>

          <TouchableOpacity style={[s.saveBtn, { backgroundColor: brand }]} onPress={handleSave} disabled={saving}>
            <Text style={s.saveBtnText}>{saving ? 'Saving...' : 'Save Expense'}</Text>
          </TouchableOpacity>

          {showPicker && (
            <ExpenseFormCategoryPicker
              categories={categories}
              selectedId={catId}
              onSelect={setCatId}
              onClose={() => setShowPicker(false)}
            />
          )}
        </View>
      </View>
    </Modal>
  )
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 40, maxHeight: '90%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  title: { fontSize: 17, fontWeight: '800' },
  fields: { padding: 16 },
  label: { fontSize: 12, fontWeight: '700', marginTop: 12, marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  picker: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12 },
  saveBtn: { marginHorizontal: 16, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
})
