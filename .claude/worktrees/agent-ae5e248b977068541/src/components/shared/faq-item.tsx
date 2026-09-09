// faq-item.tsx — FAQ accordion item component
import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { ChevronDown, ChevronUp } from 'lucide-react-native'
import { useTheme } from '../../hooks/useTheme'
import { spacing, fontSize } from '../../lib/theme'

interface Props {
  question: string
  answer: string
}

export function FaqItem({ question, answer }: Props) {
  const [open, setOpen] = useState(false)
  const { card, text, textSecondary, border } = useTheme()

  return (
    <TouchableOpacity
      style={[styles.item, { backgroundColor: card, borderColor: border }]}
      onPress={() => setOpen(!open)}
      activeOpacity={0.7}
    >
      <View style={styles.row}>
        <Text style={[styles.q, { color: text }]}>{question}</Text>
        {open ? <ChevronUp size={16} color={textSecondary} /> : <ChevronDown size={16} color={textSecondary} />}
      </View>
      {open && <Text style={[styles.a, { color: textSecondary }]}>{answer}</Text>}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  item: { borderRadius: 10, borderWidth: 1, padding: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  q: { flex: 1, fontSize: fontSize.base, fontWeight: '500', marginRight: spacing.sm },
  a: { fontSize: fontSize.sm, marginTop: spacing.sm, lineHeight: 20 },
})
