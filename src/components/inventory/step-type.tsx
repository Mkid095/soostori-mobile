// Step 0: Product type selection
import { View, Text, TouchableOpacity } from 'react-native'
import { Check } from 'lucide-react-native'

interface Props {
  productType: string
  set: (k: string, v: any) => void
  c: any
}

export function renderTypeStep({ productType, set, c }: Props) {
  return (
    <View style={{ gap: 16 }}>
      <Text style={{ fontSize: 16, fontWeight: '700', color: c.text, textAlign: 'center', marginBottom: 8 }}>
        How do you sell this product?
      </Text>
      <TypeCard
        title="Loose / Single Items"
        desc="Sold individually, one unit at a time"
        selected={productType === 'loose'}
        onPress={() => set('productType', 'loose')}
        orange={c.brand}
        text={c.text}
        cardBg={c.card}
        borderColor={c.border}
        muted={c.textSecondary}
      />
      <TypeCard
        title="Bulk / Package"
        desc="Sold in boxes, packs or cartons"
        selected={productType === 'bulk'}
        onPress={() => set('productType', 'bulk')}
        orange={c.brand}
        text={c.text}
        cardBg={c.card}
        borderColor={c.border}
        muted={c.textSecondary}
      />
    </View>
  )
}

function TypeCard({ title, desc, selected, onPress, orange, text, cardBg, borderColor, muted }: {
  title: string; desc: string; selected: boolean; onPress: () => void
  orange: string; text: string; cardBg: string; borderColor: string; muted: string
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        borderRadius: 14, padding: 20, borderWidth: 2,
        backgroundColor: selected ? orange + '15' : cardBg,
        borderColor: selected ? orange : borderColor,
      }}
    >
      <Text style={{ fontSize: 17, fontWeight: '800', color: selected ? orange : text, marginBottom: 4 }}>
        {title}
      </Text>
      <Text style={{ fontSize: 13, color: muted }}>{desc}</Text>
      {selected && (
        <View style={{ position: 'absolute', top: 12, right: 12, width: 24, height: 24, borderRadius: 12, backgroundColor: orange, justifyContent: 'center', alignItems: 'center' }}>
          <Check size={14} color="#fff" />
        </View>
      )}
    </TouchableOpacity>
  )
}
