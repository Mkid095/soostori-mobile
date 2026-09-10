// app/business-switcher.tsx — Phase 07: Business Switcher screen
// Lists all businesses user has membership in. Tap to switch active business.
import React from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, StyleSheet, Modal,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { X, Building2, Check, ChevronRight } from 'lucide-react-native'
import { AppHeader } from '../src/components/shared/app-header'
import { useTheme } from '../src/hooks/useTheme'
import { useBusinessSwitcher } from '../src/hooks/useBusinessSwitcher'

interface BusinessSwitcherProps {
  visible: boolean
  onClose: () => void
}

export function BusinessSwitcherSheet({ visible, onClose }: BusinessSwitcherProps) {
  const { bg, text, card, border, brand, textSecondary } = useTheme()
  const { businesses, activeBusinessId, loading, error, switchTo } = useBusinessSwitcher()

  async function handleSelect(businessId: string) {
    await switchTo(businessId)
    onClose()
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: border }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 17, fontWeight: '800', color: text }}>Switch Business</Text>
            <Text style={{ fontSize: 12, color: textSecondary }}>Select a business to work in</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={{ width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' }}>
            <X size={20} color={text} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {loading && (
            <View style={{ padding: 32, alignItems: 'center' }}>
              <ActivityIndicator size="large" color={brand} />
              <Text style={{ marginTop: 12, color: textSecondary, fontSize: 14 }}>Loading businesses…</Text>
            </View>
          )}

          {error && (
            <View style={{ backgroundColor: '#fef2f2', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#fecaca' }}>
              <Text style={{ color: '#dc2626', fontSize: 13, fontWeight: '600' }}>{error}</Text>
            </View>
          )}

          {!loading && businesses.length === 0 && !error && (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Building2 size={40} color={textSecondary} />
              <Text style={{ marginTop: 12, fontSize: 15, fontWeight: '600', color: textSecondary, textAlign: 'center' }}>
                No businesses found
              </Text>
              <Text style={{ marginTop: 6, fontSize: 13, color: textSecondary, textAlign: 'center' }}>
                You are not a member of any business yet.
              </Text>
            </View>
          )}

          {!loading && businesses.map((biz: BusinessListItem) => {
            const isActive = biz.id === activeBusinessId
            return (
              <TouchableOpacity
                key={biz.id}
                onPress={() => handleSelect(biz.id)}
                style={{
                  flexDirection: 'row', alignItems: 'center',
                  backgroundColor: card, borderRadius: 14,
                  borderWidth: 1.5, borderColor: isActive ? brand : border,
                  padding: 14, marginBottom: 10,
                }}
              >
                <View style={{
                  width: 44, height: 44, borderRadius: 12,
                  backgroundColor: brand + '15', justifyContent: 'center', alignItems: 'center',
                  marginRight: 12,
                }}>
                  <Building2 size={20} color={brand} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: text }}>{biz.name}</Text>
                  <Text style={{ fontSize: 12, color: textSecondary, marginTop: 2, textTransform: 'capitalize' }}>
                    {biz.type} · {biz.currency}
                  </Text>
                </View>
                {isActive ? (
                  <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: brand, justifyContent: 'center', alignItems: 'center' }}>
                    <Check size={14} color="#fff" />
                  </View>
                ) : (
                  <ChevronRight size={18} color={textSecondary} />
                )}
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  )
}
