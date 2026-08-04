// DataManagementSection — export/import backup
// Pure presentation: no business logic.

import { View, Text, TouchableOpacity, Alert } from 'react-native'
import { useTheme } from '../../hooks/useTheme'
import { getDb } from '../../lib/db'
import { cacheDirectory, writeAsStringAsync, EncodingType } from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'

export function DataManagementSection() {
  const { card, text, textSecondary: textMuted, border, isDark, brand: orange } = useTheme()

  async function handleExport() {
    try {
      const db = await getDb()
      const products = await db.getAllAsync<unknown>('SELECT * FROM products')
      const categories = await db.getAllAsync<unknown>('SELECT * FROM categories')
      const sales = await db.getAllAsync<unknown>('SELECT * FROM sales')
      const debts = await db.getAllAsync<unknown>('SELECT * FROM debts')
      const settings = await db.getFirstAsync<unknown>('SELECT * FROM shop_settings WHERE id = ?', ['default'])
      const backup = { version: '1.0.0', exportedAt: new Date().toISOString(), data: { products, categories, sales, debts, settings } }
      const json = JSON.stringify(backup, null, 2)
      const uri = (cacheDirectory || '') + 'soostori-backup.json'
      await writeAsStringAsync(uri, json, { encoding: EncodingType.UTF8 })
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/json', dialogTitle: 'Export Soostori Backup' })
      } else {
        Alert.alert('Export', 'Backup saved to cache. Sharing not available.')
      }
    } catch (e) { Alert.alert('Export Error', String(e)) }
  }

  async function handleImport() {
    Alert.alert('Import Data', 'Import replaces all current data. This cannot be undone.\n\nTo import: share your backup .json file with the app.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Continue', onPress: () => Alert.alert('Info', 'Import requires sharing the backup file to this app.') },
    ])
  }

  return (
    <View style={{ backgroundColor: card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: border }}>
      <Text style={{ fontSize: 15, fontWeight: '800', color: text, marginBottom: 4 }}>Data Management</Text>
      <Text style={{ fontSize: 11, color: textMuted, marginBottom: 12 }}>Backup or restore all your data</Text>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: orange, borderRadius: 10, paddingVertical: 12, alignItems: 'center' }}
          onPress={handleExport}
        >
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>Export Backup</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: isDark ? '#334155' : '#f1f5f9', borderRadius: 10, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: border }}
          onPress={handleImport}
        >
          <Text style={{ color: text, fontWeight: '800', fontSize: 14 }}>Import Backup</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
