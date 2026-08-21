// DataManagementSection — export/import backup (matches soostori-desktop format)
// Pure presentation: no business logic.
import { useState } from 'react'
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native'
import { useTheme } from '../../hooks/useTheme'
import { exportBackup, importBackup } from '../../services/db-backup'
import { cacheDirectory, writeAsStringAsync, readAsStringAsync, EncodingType } from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'
import { getDocumentAsync } from 'expo-document-picker'
import type { BackupData } from '../../services/db-backup'

function formatDate(iso: string) {
  return iso.split('T')[0]
}

export function DataManagementSection() {
  const { card, text, textSecondary: textMuted, border, bg, brand } = useTheme()
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)

  async function handleExport() {
    setExporting(true)
    try {
      const data = await exportBackup()
      const json = JSON.stringify(data, null, 2)
      const dateStr = formatDate(data.exportedAt)
      const filename = `soostori-backup-${dateStr}.json`
      const uri = (cacheDirectory ?? '') + filename
      await writeAsStringAsync(uri, json, { encoding: EncodingType.UTF8 })
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/json',
          dialogTitle: `Export ${filename}`,
        })
      } else {
        Alert.alert('Export Complete', `Saved as ${filename}`)
      }
    } catch (e) {
      Alert.alert('Export Failed', String(e))
    } finally {
      setExporting(false)
    }
  }

  async function handleImport() {
    Alert.alert(
      'Import Data',
      'This will replace ALL current data with the backup. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Choose File',
          onPress: async () => {
            setImporting(true)
            try {
              const result = await getDocumentAsync({
                type: ['application/json'],
              })
              if (result.canceled) { setImporting(false); return }
              const asset = result.assets[0]
              const content = await readAsStringAsync(asset.uri, { encoding: EncodingType.UTF8 })
              const data: BackupData = JSON.parse(content)
              await importBackup(data)
              Alert.alert('Import Complete', 'Data restored successfully. Restart the app to see all changes.')
            } catch (e) {
              if (String(e).includes('cancelled') || String(e).includes('dismissed')) {
                // User cancelled picker — silent
              } else {
                Alert.alert('Import Failed', String(e))
              }
            } finally {
              setImporting(false)
            }
          },
        },
      ]
    )
  }

  return (
    <View style={{ gap: 12 }}>
      {/* Warning banner */}
      <View style={{ backgroundColor: card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: border }}>
        <Text style={{ fontSize: 12, color: textMuted, lineHeight: 18 }}>
          Export creates a backup file <Text style={{ fontWeight: '700' }}>soostori-backup-YYYY-MM-DD.json</Text> you can save anywhere. Import restores all data from a backup file — this replaces all current data.
        </Text>
      </View>

      {/* Buttons */}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: brand, borderRadius: 10, paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
          onPress={handleExport}
          disabled={exporting}
        >
          {exporting
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>Export Backup</Text>
          }
        </TouchableOpacity>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: bg, borderRadius: 10, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: border, flexDirection: 'row', justifyContent: 'center', gap: 8 }}
          onPress={handleImport}
          disabled={importing}
        >
          {importing
            ? <ActivityIndicator color={text} size="small" />
            : <Text style={{ color: text, fontWeight: '800', fontSize: 14 }}>Import Backup</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  )
}
