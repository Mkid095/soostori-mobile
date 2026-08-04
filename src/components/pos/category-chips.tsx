import { ScrollView, Text, TouchableOpacity } from 'react-native'
import { useTheme } from '../../hooks/useTheme'
import type { Category } from '../../lib/types'

interface Props {
  categories: Category[]
  selected: string
  onSelect: (id: string) => void
  orange: string
}

export function CategoryChips({ categories, selected, onSelect, orange }: Props) {
  const { text } = useTheme()
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      <Chip label="All" selected={selected === 'all'} onPress={() => onSelect('all')} color={orange} text={text} />
      {categories.map((c) => (
        <Chip key={c.id} label={c.name} selected={selected === c.id} onPress={() => onSelect(c.id)} color={c.color} text={text} />
      ))}
    </ScrollView>
  )
}

function Chip({ label, selected, onPress, color, text }: { label: string; selected: boolean; onPress: () => void; color: string; text: string }) {
  const { isDark, bg: inputBg, border: chipBorder } = useTheme()
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16,
        backgroundColor: selected ? color : inputBg,
        borderWidth: 1, borderColor: selected ? color : chipBorder,
      }}
    >
      <Text style={{ color: selected ? '#fff' : text, fontWeight: '700', fontSize: 12 }}>{label}</Text>
    </TouchableOpacity>
  )
}
