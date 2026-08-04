// Step 0: Product type selection
import { View, Text, TouchableOpacity } from 'react-native'
import { Check } from 'lucide-react-native'

interface Props {
  productType: string
  set: (k: string, v: string) => void
  c: Record<string, string>
}

export function renderTypeStep({ productType, set, c }: Props) {
  return (
    <View style={{ gap: 16, paddingVertical: 8 }}>
      <Text style={{ fontSize: 16, fontWeight: '700', color: c.text, textAlign: 'center', marginBottom: 4 }}>
        How do you sell this product?
      </Text>
      <TypeCard
        title="Loose / Single Items"
        desc="Sold individually, one unit at a time"
        selected={productType === 'loose'}
        onPress={() => set('productType', 'loose')}
        c={c}
      />
      <TypeCard
        title="Bulk / Package"
        desc="Sold in boxes, packs or cartons"
        selected={productType === 'bulk'}
        onPress={() => set('productType', 'bulk')}
        c={c}
      />
    </View>
  )
}

interface CardProps {
  title: string
  desc: string
  selected: boolean
  onPress: () => void
  c: Record<string, string>
}

function TypeCard({ title, desc, selected, onPress, c }: CardProps) {
  const { brand: orange, text, card: cardBg, border: borderColor, textSecondary: muted } = c
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        minHeight: 88, borderRadius: 14, padding: 20, borderWidth: 2,
        backgroundColor: selected ? orange + '15' : cardBg,
        borderColor: selected ? orange : borderColor,
        flexDirection: 'row', alignItems: 'center',
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 17, fontWeight: '800', color: selected ? orange : text, marginBottom: 4 }}>
          {title}
        </Text>
        <Text style={{ fontSize: 13, color: muted }}>{desc}</Text>
      </View>
      {selected && (
        <View style={{
          width: 28, height: 28, borderRadius: 14,
          backgroundColor: orange, justifyContent: 'center', alignItems: 'center',
          marginLeft: 12,
        }}>
          <Check size={16} color="#fff" />
        </View>
      )}
    </TouchableOpacity>
  )
}
