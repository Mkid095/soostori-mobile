// WizardFooter — Next/Back/Save navigation buttons
import { View, Text, TouchableOpacity } from 'react-native'
import { ChevronRight, ChevronLeft } from 'lucide-react-native'

interface Props {
  step: number
  isEdit: boolean
  saving: boolean
  onBack: () => void
  onNext: () => void
  onSubmit: () => void
  c: Record<string, string>
}

export function WizardFooter({ step, isEdit, saving, onBack, onNext, onSubmit, c }: Props) {
  const { border, brand: orange, textSecondary: muted, success, danger } = c
  const isLast = step === 4

  return (
    <View style={{
      paddingHorizontal: 16, paddingVertical: 12,
      borderTopWidth: 1, borderTopColor: border,
      gap: 10,
    }}>
      {isLast ? (
        <TouchableOpacity
          style={{
            backgroundColor: saving ? muted : success,
            borderRadius: 10, paddingVertical: 16,
            alignItems: 'center', minHeight: 52,
          }}
          onPress={onSubmit}
          disabled={saving}
          activeOpacity={0.8}
        >
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Save Product'}
          </Text>
        </TouchableOpacity>
      ) : (
        <>
          <TouchableOpacity
            style={{
              backgroundColor: orange,
              borderRadius: 10, paddingVertical: 16,
              alignItems: 'center', minHeight: 52,
            }}
            onPress={onNext}
            activeOpacity={0.8}
          >
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>
              Next <ChevronRight size={16} color="#fff" style={{ marginLeft: 4 }} />
            </Text>
          </TouchableOpacity>
          {step > 0 && (
            <TouchableOpacity
              style={{
                backgroundColor: c.card,
                borderRadius: 10, paddingVertical: 14,
                alignItems: 'center', minHeight: 48,
                borderWidth: 1, borderColor: border,
              }}
              onPress={onBack}
              activeOpacity={0.8}
            >
              <Text style={{ color: c.text, fontWeight: '600', fontSize: 14 }}>
                <ChevronLeft size={16} color={c.text} /> Back
              </Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  )
}
