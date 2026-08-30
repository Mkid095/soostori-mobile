// DataManagementSection — full + CSV backup, no business logic
import { useState } from 'react'
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, StyleSheet } from 'react-native'
import { Download, Upload } from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import { exportBackup, importBackup } from '../../services/db-backup'
import {
  exportProductsToCsv,
  getAllActiveProducts,
  parseProductCsv,
  buildReconciliation,
} from '../../services/db-import-export'
import { CsvReconciliationPreview } from './csv-reconciliation-preview'
import { cacheDirectory, writeAsStringAsync, readAsStringAsync, EncodingType } from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'
import { getDocumentAsync } from 'expo-document-picker'
import type { BackupData } from '../../services/db-backup'

function formatDate(iso: string) { return iso.split('T')[0] }

export function DataManagementSection() {
  const { card, text, textSecondary: textMuted, border, bg, brand, success } = useTheme()
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [csvContent, setCsvContent] = useState('')
  const [showReconciliation, setShowReconciliation] = useState(false)

  async function handleExport() {
    setExporting(true)
    try {
      const data = await exportBackup()
      const json = JSON.stringify(data, null, 2)
      const filename = `soostori-backup-${formatDate(data.exportedAt)}.json`
      const uri = (cacheDirectory ?? '') + filename
      await writeAsStringAsync(uri, json, { encoding: EncodingType.UTF8 })
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/json', dialogTitle: `Export ${filename}` })
      } else { Alert.alert('Export Complete', `Saved as ${filename}`) }
    } catch (e) { Alert.alert('Export Failed', String(e)) }
    finally { setExporting(false) }
  }

  async function handleImport() {
    Alert.alert('Import Data', 'This will replace ALL current data with the backup.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Choose File', onPress: async () => {
          setImporting(true)
          try {
            const result = await getDocumentAsync({ type: ['application/json'] })
            if (result.canceled) { setImporting(false); return }
            const content = await readAsStringAsync(result.assets[0].uri, { encoding: EncodingType.UTF8 })
            await importBackup(JSON.parse(content) as BackupData)
            Alert.alert('Import Complete', 'Data restored. Restart the app to see all changes.')
          } catch (e) {
            if (!String(e).includes('cancelled') && !String(e).includes('dismissed')) {
              Alert.alert('Import Failed', String(e))
            }
          } finally { setImporting(false) }
        }},
      ]
    )
  }

  async function handleCsvExport() {
    setExporting(true)
    try {
      const products = await getAllActiveProducts()
      const csv = exportProductsToCsv(products)
      const filename = `soostori-products-${formatDate(new Date().toISOString())}.csv`
      const uri = (cacheDirectory ?? '') + filename
      await writeAsStringAsync(uri, csv, { encoding: EncodingType.UTF8 })
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'text/csv', dialogTitle: `Export ${filename}` })
      } else { Alert.alert('Export Complete', `Saved as ${filename}`) }
    } catch (e) { Alert.alert('Export Failed', String(e)) }
    finally { setExporting(false) }
  }

  async function handleCsvImport() {
    try {
      const result = await getDocumentAsync({ type: ['text/csv', 'text/comma-separated-values'] })
      if (result.canceled) return
      const content = await readAsStringAsync(result.assets[0].uri, { encoding: EncodingType.UTF8 })
      const { rows, errors } = parseProductCsv(content)
      if (errors.length > 0 && rows.length === 0) { Alert.alert('Parse Error', errors[0]); return }
      const recon = await buildReconciliation(rows)
      recon.errors.push(...errors)
      setCsvContent(content)
      setShowReconciliation(true)
    } catch (e) { Alert.alert('Import Failed', String(e)) }
  }

  return (
    <View style={{ gap: 12 }}>
      <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
        <Text style={{ fontSize: 12, color: textMuted, lineHeight: 18 }}>
          <Text style={{ fontWeight: '700' }}>Full Backup</Text> — Export/import all app data as JSON.{' '}
          <Text style={{ fontWeight: '700' }}>Products CSV</Text> — Export or import product list as CSV.
        </Text>
      </View>

      {/* Full Backup */}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TouchableOpacity style={[styles.btn, { backgroundColor: brand }]} onPress={handleExport} disabled={exporting}>
          {exporting ? <ActivityIndicator color="#fff" size="small" />
            : <><Download size={15} color="#fff" /><Text style={styles.btnText}>Export Backup</Text></>}
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btnOutline, { borderColor: border, backgroundColor: bg }]} onPress={handleImport} disabled={importing}>
          {importing ? <ActivityIndicator color={text} size="small" />
            : <><Upload size={15} color={text} /><Text style={[styles.btnText, { color: text }]}>Import Backup</Text></>}
        </TouchableOpacity>
      </View>

      {/* CSV */}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TouchableOpacity style={[styles.btnOutline, { borderColor: border, backgroundColor: bg }]} onPress={handleCsvExport} disabled={exporting}>
          <Download size={15} color={text} /><Text style={[styles.btnText, { color: text }]}>Export Products</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btnOutline, { borderColor: border, backgroundColor: bg }]} onPress={handleCsvImport}>
          <Upload size={15} color={text} /><Text style={[styles.btnText, { color: text }]}>Import Products</Text>
        </TouchableOpacity>
      </View>

      <CsvReconciliationPreview
        visible={showReconciliation}
        csvContent={csvContent}
        onClose={() => setShowReconciliation(false)}
        onDone={() => { setShowReconciliation(false); Alert.alert('Done', 'Products imported successfully.') }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, padding: 14, borderWidth: 1 },
  btn: { flex: 1, flexDirection: 'row', borderRadius: 10, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', gap: 7 },
  btnOutline: { flex: 1, flexDirection: 'row', borderRadius: 10, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1 },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
})
