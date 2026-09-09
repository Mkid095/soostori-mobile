// ExpenseListHeader — filter bar + month picker.
// Pure presentation: emits selection events.

import { useState } from 'react'
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native'
import { Filter, Calendar, X } from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

interface FilterBarProps {
  selectedCategoryId: string | null
  categoryName: string | null
  onCategoryPress: () => void
  onMonthPress: () => void
  monthLabel: string
}

export function FilterBar({ selectedCategoryId, categoryName, onCategoryPress, onMonthPress, monthLabel }: FilterBarProps) {
  const { border, brand, text, muted } = useTheme()

  return (
    <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingVertical: 8 }}>
      <TouchableOpacity
        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: border }}
        onPress={onCategoryPress}
      >
        <Filter size={14} color={selectedCategoryId ? brand : muted} />
        <Text style={{ color: selectedCategoryId ? brand : muted, fontSize: 13, fontWeight: '600' }} numberOfLines={1}>
          {categoryName ?? 'All Categories'}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: border }}
        onPress={onMonthPress}
      >
        <Calendar size={14} color={brand} />
        <Text style={{ color: text, fontSize: 13, fontWeight: '600' }}>{monthLabel}</Text>
      </TouchableOpacity>
    </View>
  )
}

interface MonthPickerProps {
  visible: boolean
  year: number
  month: number
  onSelect: (year: number, month: number) => void
  onClose: () => void
}

export function MonthPicker({ visible, year, month, onSelect, onClose }: MonthPickerProps) {
  const { card, text, border, brand } = useTheme()
  const [selectedYear, setSelectedYear] = useState(year)
  const years = [selectedYear - 1, selectedYear, selectedYear + 1]

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={[s.modal, { backgroundColor: card, borderColor: border }]}>
          <Text style={[s.title, { color: text }]}>Select Month</Text>
          <View style={s.yearRow}>
            {years.map((y) => (
              <TouchableOpacity key={y} onPress={() => setSelectedYear(y)} style={[s.yearBtn, y === selectedYear && { backgroundColor: brand + '20' }]}>
                <Text style={[s.yearText, { color: y === selectedYear ? brand : text }]}>{y}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={s.grid}>
            {MONTHS.map((m, i) => (
              <TouchableOpacity
                key={m}
                style={[s.monthBtn, month === i + 1 && selectedYear === year && { backgroundColor: brand }]}
                onPress={() => { onSelect(selectedYear, i + 1); onClose() }}
              >
                <Text style={[s.monthText, { color: month === i + 1 && selectedYear === year ? '#fff' : text }]}>{m}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={[s.cancelBtn, { borderColor: border }]} onPress={onClose}>
            <Text style={{ color: text }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modal: { width: 300, borderRadius: 16, padding: 20, borderWidth: 1 },
  title: { fontSize: 17, fontWeight: '800', textAlign: 'center', marginBottom: 16 },
  yearRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 16 },
  yearBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  yearText: { fontSize: 15, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  monthBtn: { width: '30%', aspectRatio: 2, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  monthText: { fontSize: 13, fontWeight: '700' },
  cancelBtn: { marginTop: 16, borderWidth: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
})
