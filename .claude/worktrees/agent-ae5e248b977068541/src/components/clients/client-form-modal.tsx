// ClientFormModal — add/edit client form modal.
// Pure presentation: emits save/cancel events.

import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, Alert } from 'react-native'
import { X } from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import type { Client } from '../../lib/types'
import { createClient, updateClient } from '../../services/db-clients'

interface Props {
  client?: Client | null
  visible: boolean
  onClose: () => void
  onSaved: () => void
}

export function ClientFormModal({ client, visible, onClose, onSaved }: Props) {
  const { bg, card, text, border, brand } = useTheme()
  const [name, setName] = useState(client?.name ?? '')
  const [phone, setPhone] = useState(client?.phone ?? '')
  const [idNumber, setIdNumber] = useState(client?.idNumber ?? '')
  const [saving, setSaving] = useState(false)

  function reset() {
    setName(client?.name ?? '')
    setPhone(client?.phone ?? '')
    setIdNumber(client?.idNumber ?? '')
  }

  async function handleSave() {
    if (!name.trim()) { Alert.alert('Required', 'Client name is required.'); return }
    setSaving(true)
    try {
      if (client?.id) {
        await updateClient(client.id, {
          name: name.trim(),
          phone: phone.trim() || undefined,
          idNumber: idNumber.trim() || undefined,
        })
      } else {
        await createClient({
          name: name.trim(),
          phone: phone.trim() || undefined,
          idNumber: idNumber.trim() || undefined,
        })
      }
      onSaved()
      onClose()
    } catch {
      Alert.alert('Error', 'Failed to save client.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={mc.overlay}>
        <View style={[mc.sheet, { backgroundColor: card }]}>
          <View style={[mc.header, { borderBottomColor: border }]}>
            <Text style={[mc.title, { color: text }]}>{client?.id ? 'Edit Client' : 'Add Client'}</Text>
            <TouchableOpacity onPress={onClose}><X size={20} color={text} /></TouchableOpacity>
          </View>
          <View style={mc.fields}>
            <Text style={[mc.label, { color: text }]}>Name *</Text>
            <TextInput
              style={[mc.input, { backgroundColor: bg, color: text, borderColor: border }]}
              placeholder="Full name"
              placeholderTextColor="#94A3B8"
              value={name}
              onChangeText={setName}
            />
            <Text style={[mc.label, { color: text }]}>Phone</Text>
            <TextInput
              style={[mc.input, { backgroundColor: bg, color: text, borderColor: border }]}
              placeholder="0712 345 678"
              placeholderTextColor="#94A3B8"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
            <Text style={[mc.label, { color: text }]}>ID Number</Text>
            <TextInput
              style={[mc.input, { backgroundColor: bg, color: text, borderColor: border }]}
              placeholder="National ID"
              placeholderTextColor="#94A3B8"
              value={idNumber}
              onChangeText={setIdNumber}
            />
          </View>
          <TouchableOpacity
            style={[mc.saveBtn, { backgroundColor: brand }]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={mc.saveBtnText}>{saving ? 'Saving...' : 'Save Client'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const mc = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  title: { fontSize: 17, fontWeight: '800' },
  fields: { padding: 16, gap: 4 },
  label: { fontSize: 12, fontWeight: '700', marginTop: 10, marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  saveBtn: { marginHorizontal: 16, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
})
