// ConfirmModal — reusable delete/confirmation modal
// Pure presentation: no business logic, no API calls.

import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native'
import { useTheme } from '../../hooks/useTheme'

interface Props {
  visible: boolean
  title: string
  message: string
  confirmLabel?: string
  destructive?: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  destructive = false,
  onCancel,
  onConfirm,
}: Props) {
  const { card, text, textSecondary: textMuted, border, danger, brand: orange } = useTheme()

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={[styles.dialog, { backgroundColor: card, borderColor: border }]}>
          <Text style={[styles.title, { color: text }]}>{title}</Text>
          <Text style={[styles.message, { color: textMuted }]}>{message}</Text>
          <View style={[styles.buttonRow, { borderTopColor: border }]}>
            <TouchableOpacity
              style={[styles.btn, { borderRightColor: border, borderRightWidth: 1 }]}
              onPress={onCancel}
              activeOpacity={0.7}
            >
              <Text style={[styles.btnText, { color: text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.btn}
              onPress={onConfirm}
              activeOpacity={0.7}
            >
              <Text style={[styles.btnText, { color: destructive ? danger : orange, fontWeight: '700' }]}>
                {confirmLabel}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 32 },
  dialog: { width: '100%', borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  title: { fontSize: 17, fontWeight: '700', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  message: { fontSize: 14, paddingHorizontal: 20, paddingBottom: 20, lineHeight: 20 },
  buttonRow: { flexDirection: 'row', borderTopWidth: 1 },
  btn: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  btnText: { fontSize: 15, fontWeight: '600' },
})
