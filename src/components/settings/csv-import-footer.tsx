// Import footer for csv-reconciliation-preview
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native'

interface Props {
  onCancel: () => void
  onImport: () => void
  disabled: boolean
  importing: boolean
  border: string
  text: string
  success: string
}

export function CsvImportFooter({ onCancel, onImport, disabled, importing, border, text, success }: Props) {
  return (
    <View style={{ flexDirection: 'row', gap: 10, padding: 14, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e5e7eb' }}>
      <TouchableOpacity style={{ flex: 1, borderRadius: 10, paddingVertical: 13, alignItems: 'center', borderWidth: 1, borderColor: border }} onPress={onCancel} disabled={importing}>
        <Text style={{ color: text, fontWeight: '700' }}>Cancel</Text>
      </TouchableOpacity>
      <TouchableOpacity style={{ flex: 2, borderRadius: 10, paddingVertical: 13, alignItems: 'center', backgroundColor: success, opacity: importing ? 0.6 : 1 }} onPress={onImport} disabled={disabled}>
        {importing ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: '#fff', fontWeight: '800' }}>Import Selected</Text>}
      </TouchableOpacity>
    </View>
  )
}
