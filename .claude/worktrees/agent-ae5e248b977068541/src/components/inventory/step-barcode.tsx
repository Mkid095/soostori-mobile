// Step 5: Barcode
import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity } from 'react-native'
import { Camera, RefreshCw, Keyboard, Check } from 'lucide-react-native'

type BarcodeMode = 'scan' | 'manual' | 'generate'

interface Props {
  form: Record<string, unknown>
  set: (k: string, v: unknown) => void
  c: Record<string, string>
  onScan: () => void
  onGenerate: () => void
  isEdit: boolean
}

function inputStyle(c: Record<string, string>) {
  return {
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, borderWidth: 1,
    backgroundColor: c.card, color: c.text, borderColor: c.border,
  }
}

export function renderBarcodeStep({ form, set, c, onScan, onGenerate, isEdit }: Props) {
  const [mode, setMode] = useState<BarcodeMode>('generate')

  function selectMode(m: BarcodeMode) {
    setMode(m)
  }

  return (
    <View style={{ gap: 14 }}>
      <View style={{ gap: 4 }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: c.text }}>
          Barcode
        </Text>
        <Text style={{ fontSize: 13, color: c.textSecondary }}>
          Optional - used for quick product lookup at POS
        </Text>
      </View>

      {/* Mode toggle */}
      <View style={{
        flexDirection: 'row',
        backgroundColor: c.card,
        borderRadius: 10,
        padding: 4,
        gap: 4,
      }}>
        <TouchableOpacity
          style={{
            flex: 1,
            paddingVertical: 10,
            borderRadius: 8,
            alignItems: 'center',
            backgroundColor: mode === 'scan' ? c.brand : 'transparent',
          }}
          onPress={() => selectMode('scan')}
        >

          <Camera size={18} color={mode === 'scan' ? '#fff' : c.textSecondary} />
          <Text style={{
            fontSize: 11,
            fontWeight: '600',
            color: mode === 'scan' ? '#fff' : c.textSecondary,
            marginTop: 4,
          }}>
            Scan
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            flex: 1,
            paddingVertical: 10,
            borderRadius: 8,
            alignItems: 'center',
            backgroundColor: mode === 'manual' ? c.brand : 'transparent',
          }}
          onPress={() => selectMode('manual')}
        >

          <Keyboard size={18} color={mode === 'manual' ? '#fff' : c.textSecondary} />
          <Text style={{
            fontSize: 11,
            fontWeight: '600',
            color: mode === 'manual' ? '#fff' : c.textSecondary,
            marginTop: 4,
          }}>
            Manual
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            flex: 1,
            paddingVertical: 10,
            borderRadius: 8,
            alignItems: 'center',
            backgroundColor: mode === 'generate' ? c.brand : 'transparent',
          }}
          onPress={() => selectMode('generate')}
        >

          <RefreshCw size={18} color={mode === 'generate' ? '#fff' : c.textSecondary} />
          <Text style={{
            fontSize: 11,
            fontWeight: '600',
            color: mode === 'generate' ? '#fff' : c.textSecondary,
            marginTop: 4,
          }}>
            Auto
          </Text>
        </TouchableOpacity>
      </View>

      {/* Mode content */}
      {mode === 'scan' && (
        <TouchableOpacity
          style={{
            backgroundColor: c.card,
            borderRadius: 12,
            paddingVertical: 24,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: c.border,
            borderStyle: 'dashed',
          }}
          onPress={onScan}
        >

          <Camera size={32} color={c.brand} />
          <Text style={{ color: c.text, fontWeight: '600', fontSize: 14, marginTop: 8 }}>
            Tap to Scan Barcode
          </Text>
          <Text style={{ color: c.textSecondary, fontSize: 12, marginTop: 4 }}>
            Opens camera to scan existing barcode
          </Text>
        </TouchableOpacity>
      )}

      {mode === 'manual' && (
        <View>
          <Text style={{ fontSize: 13, fontWeight: '600', color: c.text, marginBottom: 8 }}>
            Enter Barcode Manually
          </Text>
          <TextInput
            style={inputStyle(c)}
            placeholder="Type barcode number here"
            placeholderTextColor={c.textSecondary}
            value={(form.barcode as string) || ''}
            onChangeText={(v) => set('barcode', v)}
            onSubmitEditing={(e) => { e.preventDefault() }}
            keyboardType="default"
            returnKeyType="done"
          />
        </View>
      )}

      {mode === 'generate' && (
        <TouchableOpacity
          style={{
            backgroundColor: c.brand,
            borderRadius: 12,
            paddingVertical: 16,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 8,
          }}
          onPress={onGenerate}
        >

          <RefreshCw size={20} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>
            Generate New Barcode
          </Text>
        </TouchableOpacity>
      )}

      {/* Barcode value display */}
      {!!form.barcode && (
        <View style={{
          backgroundColor: c.card,
          borderRadius: 12,
          padding: 14,
          borderWidth: 2,
          borderColor: c.success,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        }}>

          <Check size={20} color={c.success} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: c.success, fontSize: 11, fontWeight: '600' }}>
              {isEdit ? 'BARCODE SET' : 'BARCODE GENERATED'}
            </Text>
            <Text style={{ color: c.text, fontSize: 15, fontWeight: '700', marginTop: 2 }}>
              {String(form.barcode)}
            </Text>
          </View>
        </View>
      )}
    </View>
  )
}
