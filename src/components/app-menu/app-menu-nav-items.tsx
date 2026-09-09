// Navigation items renderer for app-menu
import React from 'react'
import { ScrollView } from 'react-native'
import { usePathname, useRouter } from 'expo-router'
import { ALL_MENU_ITEMS } from './app-menu-nav'
import { AppMenuItem } from './app-menu-item'
import { useMenu } from '../../hooks/MenuContext'

interface Props {
  isDark: boolean
  text: string
  textSecondary: string
  brand: string
}

export function AppMenuNavItems({ isDark, text, textSecondary, brand }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const { closeMenu } = useMenu()

  function navigate(href: string) {
    router.push(href as never)
    closeMenu()
  }

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingVertical: 8 }} showsVerticalScrollIndicator={false}>
      {ALL_MENU_ITEMS.map((item) => (
        <AppMenuItem
          key={item.href}
          label={item.label}
          href={item.href}
          icon={item.icon}
          active={pathname.startsWith(item.href)}
          isDark={isDark}
          text={text}
          textSecondary={textSecondary}
          brand={brand}
          onPress={navigate}
        />
      ))}
    </ScrollView>
  )
}
