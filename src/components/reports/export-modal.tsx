import { useState } from 'react'
import { View, Text, TouchableOpacity, Modal, ScrollView, Alert, StyleSheet } from 'react-native'
import { X, FileText, Download, Calendar } from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import type { Sale } from '../../lib/types'
import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'
import {
  type ExportPeriod,
  periodLabel,
  periodColors,
  filterSalesByPeriod,
  generateSalesHTML,
  generateSalesCSV,
} from '../../lib/report-export'

type ExportFormat = 'csv' | 'pdf'

interface Props {
  sales: Sale[]
  visible: boolean
  onClose: () => void
}

export function ExportModal({ sales, visible, onClose }: Props) {
  const { bg, card, text, border, brand } = useTheme()
  const [period, setPeriod] = useState<ExportPeriod>('today')
  const [format, setFormat] = useState<ExportFormat>('csv')

  async function handleExport() {
    try {
      if (format === 'csv') {
        const uri = await Print.printToFileAsync({ html: `<pre>${generateSalesCSV(sales, period)}</pre>` })
        if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri.uri)
        else Alert.alert('Sharing not available')
      } else {
        await Print.printAsync({ html: generateSalesHTML(sales, period) })
      }
      onClose()
    } catch (e) {
      Alert.alert('Export Error', String(e))
    }
  }

  const count = filterSalesByPeriod(sales, period).length

  return (
    <Modal visible={visible} onRequestClose={onClose} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.container, { backgroundColor: bg }]}>
        <View style={[styles.header, { borderBottomColor: border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <FileText size={20} color={brand} />
            <Text style={[styles.title, { color: text }]}>Export Report</Text>
          </View>
          <TouchableOpacity onPress={onClose}><X size={20} color={text} /></TouchableOpacity>
        </View>

        <ScrollView style={styles.body}>
          <Text style={[styles.label, { color: text }]}>Period</Text>
          <View style={styles.periodGrid}>
            {(['today', 'week', 'month', 'year', 'all'] as ExportPeriod[]).map((p) => (
              <TouchableOpacity
                key={p}
                onPress={() => setPeriod(p)}
                style={[
                  styles.periodBtn,
                  { borderColor: border, backgroundColor: period === p ? `${periodColors[p]}15` : 'transparent' },
                ]}
              >
                <Calendar size={14} color={period === p ? periodColors[p] : '#94A3B8'} />
                <Text style={[styles.periodBtnText, { color: period === p ? periodColors[p] : text }]}>
                  {periodLabel(p)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.label, { color: text }]}>Format</Text>
          <View style={[styles.formatRow, { backgroundColor: card, borderColor: border }]}>
            {(['csv', 'pdf'] as ExportFormat[]).map((f) => (
              <TouchableOpacity
                key={f}
                onPress={() => setFormat(f)}
                style={[styles.formatBtn, { backgroundColor: format === f ? brand : 'transparent', borderColor: border }]}
              >
                <Text style={{ color: format === f ? '#fff' : text, fontWeight: '700', fontSize: 13, textTransform: 'uppercase' }}>
                  {f}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.count, { color: '#94A3B8' }]}>
            {count} sale{count !== 1 ? 's' : ''} in this period
          </Text>
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: border }]}>
          <TouchableOpacity style={[styles.exportBtn, { backgroundColor: brand }]} onPress={handleExport}>
            <Download size={16} color="#fff" />
            <Text style={styles.exportBtnText}>Export {format.toUpperCase()}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  title: { fontSize: 18, fontWeight: '800' },
  body: { flex: 1, padding: 16 },
  label: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 8, marginTop: 8 },
  periodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  periodBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1,
  },
  periodBtnText: { fontSize: 13, fontWeight: '600' },
  formatRow: { flexDirection: 'row', borderRadius: 10, borderWidth: 1, overflow: 'hidden', marginBottom: 16 },
  formatBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 0 },
  count: { fontSize: 13, textAlign: 'center', marginTop: 8 },
  footer: { padding: 16, borderTopWidth: 1 },
  exportBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16, borderRadius: 12,
  },
  exportBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' }
})
