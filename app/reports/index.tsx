// app/reports/index.tsx — Phase 19: Reports hub with tab bar and date range filter
// Tabs: Sales | Inventory | Debt | Expense
// Each tab renders the existing report screen.
import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useTheme } from '../../src/hooks/useTheme'

type ReportTab = 'sales' | 'inventory' | 'debt' | 'expense'

const TABS: { key: ReportTab; label: string; path: string }[] = [
  { key: 'sales', label: 'Sales', path: '/reports/sales' },
  { key: 'inventory', label: 'Inventory', path: '/reports/inventory' },
  { key: 'debt', label: 'Debt', path: '/reports/debt' },
  { key: 'expense', label: 'Expense', path: '/reports/expense' },
]

export default function ReportsIndexScreen() {
  const { bg, card, text, muted, border, brand } = useTheme()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<ReportTab>('sales')

  function handleTab(tab: ReportTab) {
    setActiveTab(tab)
    const t = TABS.find(t => t.key === tab)
    if (t) router.replace(t.path as any)
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>
      {/* Tab bar */}
      <View style={[styles.tabBar, { backgroundColor: card, borderBottomColor: border }]}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              activeTab === tab.key && { borderBottomColor: brand, borderBottomWidth: 2 },
            ]}
            onPress={() => handleTab(tab.key)}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === tab.key ? brand : muted },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Prompt to select a report */}
      <View style={styles.prompt}>
        <Text style={[styles.promptText, { color: muted }]}>
          Select a report tab above
        </Text>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
  },
  prompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  promptText: {
    fontSize: 15,
  },
})
