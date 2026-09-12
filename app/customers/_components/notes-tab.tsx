// notes-tab.tsx — Phase 19: customer notes sub-component
import { useState } from 'react'
import { View, Text, TextInput, Button, StyleSheet } from 'react-native'
import { useTheme } from '../../../src/hooks/useTheme'

interface NotesTabProps {
  notes: string
  onSave: (notes: string) => void
}

export function NotesTab({ notes, onSave }: NotesTabProps) {
  const { card, text, border } = useTheme()
  const [value, setValue] = useState(notes)

  return (
    <View style={{ padding: 16 }}>
      <TextInput
        style={[styles.input, { backgroundColor: card, color: text, borderColor: border }]}
        multiline
        numberOfLines={6}
        placeholder="Customer notes..."
        placeholderTextColor="#888"
        value={value}
        onChangeText={setValue}
        textAlignVertical="top"
      />
      <Button title="Save Notes" onPress={() => onSave(value)} />
    </View>
  )
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    minHeight: 140,
    marginBottom: 12,
  },
})
