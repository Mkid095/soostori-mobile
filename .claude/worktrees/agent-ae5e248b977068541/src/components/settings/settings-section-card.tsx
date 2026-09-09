// settings-section-card.tsx — Reusable settings card (matches desktop SectionCard)
import React from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { useTheme } from '../../hooks/useTheme'
import { ChevronRight } from 'lucide-react-native'

interface SettingsSectionCardProps {
  icon: React.ReactNode
  title: string
  description: string
  badge?: string
  badgeColor?: string
  onPress: () => void
}

export function SettingsSectionCard({
  icon,
  title,
  description,
  badge,
  badgeColor,
  onPress,
}: SettingsSectionCardProps) {
  const { text, textSecondary, border, muted, card } = useTheme()

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: card,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: border,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
      }}
    >
      {/* Icon */}
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          backgroundColor: '#fff7ed',
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: 14,
        }}
      >
        {icon}
      </View>

      {/* Text */}
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: text, flex: 1 }}>{title}</Text>
          {badge && (
            <View
              style={{
                backgroundColor: badgeColor || '#fee2e2',
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 20,
                marginLeft: 6,
              }}
            >
              <Text style={{ fontSize: 10, fontWeight: '700', color: badgeColor ? '#991b1b' : '#dc2626' }}>
                {badge}
              </Text>
            </View>
          )}
        </View>
        <Text style={{ fontSize: 12, color: textSecondary }} numberOfLines={1}>{description}</Text>
      </View>

      {/* Chevron */}
      <View style={{ marginLeft: 8 }}>
        
        <ChevronRight size={18} color={muted} />
      </View>
    </TouchableOpacity>
  )
}
