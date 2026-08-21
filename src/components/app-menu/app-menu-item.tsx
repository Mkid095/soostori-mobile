// app-menu-item.tsx — Single nav row renderer for AppMenu
import React from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { makeStyles } from './app-menu.styles'

interface IconProps {
  color?: string
  size?: number
}

interface AppMenuItemProps {
  label: string
  href: string
  icon: React.ReactElement
  active: boolean
  isDark: boolean
  textSecondary: string
  text: string
  brand: string
  onPress: (href: string) => void
}

export function AppMenuItem({ label, href, icon, active, isDark, textSecondary, text, brand, onPress }: AppMenuItemProps) {
  const s = makeStyles()

  return (
    <TouchableOpacity
      style={[s.navItem, active && { backgroundColor: brand + (isDark ? '22' : '14') }]}
      onPress={() => onPress(href)}
      activeOpacity={0.7}
    >
      <View style={[s.iconWrap, { backgroundColor: brand + (isDark ? '22' : '14') }]}>
        {React.cloneElement(icon as React.ReactElement<IconProps>, {
          color: active ? brand : textSecondary,
          size: 20,
        })}
      </View>
      <View style={s.navText}>
        <Text style={[s.navLabel, { color: active ? brand : text }]}>
          {label}
        </Text>
        {active && <View style={[s.activeBar, { backgroundColor: brand }]} />}
      </View>
      {active && <View style={[s.activeDot, { backgroundColor: brand }]} />}
    </TouchableOpacity>
  )
}
