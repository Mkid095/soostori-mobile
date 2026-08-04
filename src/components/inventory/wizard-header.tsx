// WizardHeader — step indicators and step label
import { View, Text, TouchableOpacity } from 'react-native'
import { X, ChevronLeft } from 'lucide-react-native'

const STEP_LABELS = ['Type', 'Details', 'Pricing', 'Distributor', 'Barcode']

interface Props {
  step: number
  isEdit: boolean
  onBack: () => void
  onClose: () => void
  c: Record<string, string>
}

export function WizardHeader({ step, isEdit, onBack, onClose, c }: Props) {
  const { text, textSecondary: muted, border, brand: orange, success } = c

  return (
    <>
      {/* Header row */}
      <View style={{
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: border,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity
            onPress={step > 0 ? onBack : onClose}
            style={{ width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' }}
          >
            {step > 0
              ? <ChevronLeft size={20} color={text} />
              : <X size={20} color={text} />}
          </TouchableOpacity>
          <Text style={{ fontSize: 17, fontWeight: '800', color: text }}>
            {isEdit ? 'Edit Product' : 'Add Product'}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {STEP_LABELS.map((_, i) => (
            <View
              key={i}
              style={{
                width: 10, height: 10, borderRadius: 5,
                backgroundColor: i === step ? orange : i < step ? success : border,
              }}
            />
          ))}
        </View>
      </View>

      {/* Step label */}
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 }}>
        <Text style={{ color: muted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>
          Step {step + 1} of 5 — {STEP_LABELS[step]}
        </Text>
      </View>
    </>
  )
}
