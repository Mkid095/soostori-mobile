// settings-modal.tsx — Full-screen modal for settings sections (mobile adaptation of desktop SettingsModal)
import React from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Modal } from 'react-native'
import { useTheme } from '../../hooks/useTheme'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { X } from 'lucide-react-native'

interface SettingsModalProps {
  visible: boolean
  title: string
  subtitle?: string
  icon: React.ReactNode
  onClose: () => void
  children: React.ReactNode
}

export function SettingsModal({ visible, title, subtitle, icon, onClose, children }: SettingsModalProps) {
  const { card, text, textSecondary, border, brand } = useTheme()
  const insets = useSafeAreaInsets()

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: card }}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderBottomColor: border,
            paddingTop: insets.top + 8,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: brand,
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 12,
              }}
            >
              {icon}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: text }}>{title}</Text>
              {subtitle && (
                <Text style={{ fontSize: 12, color: textSecondary }}>{subtitle}</Text>
              )}
            </View>
          </View>

          <TouchableOpacity
            onPress={onClose}
            style={{ width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' }}
          >
    // @ts-expect-error
            <X size={20} color={String(textSecondary)} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20, paddingBottom: 88 }}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </View>
    </Modal>
  )
}
