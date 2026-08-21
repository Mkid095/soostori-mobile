// ChangelogSection — scrollable list of recent changelog entries + update checker
// Pure presentation: no business logic.

import { View, Text } from 'react-native'
import { useTheme } from '../../hooks/useTheme'
import { APP_VERSION } from '../../lib/constants'
import { UpdateChecker, checkForUpdate } from './update-checker'

interface ChangelogEntry {
  version: string
  date: string
  changes: string[]
}

const ENTRIES: ChangelogEntry[] = [
  {
    version: '1.1.0',
    date: 'Aug 2026',
    changes: [
      'Custom 3-tab bottom bar [POS ·FAB· Reports] with floating menu button',
      'Slide-up menu panel with all nav items + sync/dark mode toggles',
      'Settings rebuilt: section cards → full-screen modals (desktop pattern)',
      'Payment channels wired: Send Money, Paybill, Bank Paybill, Pochi — all saved to DB',
      'POS checkout derives payment options from shop settings (desktop parity)',
      'All pages respect bottom bar spacing (no content hidden underneath)',
      'Complete light/dark mode audit — all hardcoded colors replaced with theme',
      'Changelog viewer inside Settings app',
    ],
  },
  {
    version: '1.0.0',
    date: 'Aug 2026',
    changes: [
      'Complete offline-first POS with inventory, sales, debt, and reports',
      'Dark and light theme support across all screens',
      'M-Pesa Send Money, Paybill, Bank Paybill, and Pochi La Biashara',
      'Barcode scanner and group pricing support',
      'Biometric authentication (fingerprint / face)',
      'Product import/export and data backup',
      'Sales receipt generation',
    ],
  },
]

export function ChangelogSection() {
  const { card, text, textSecondary, border, brand } = useTheme()

  return (
    <View style={{ gap: 16 }}>
      {ENTRIES.map((entry) => (
        <View
          key={entry.version}
          style={{ backgroundColor: card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: border }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View
                style={{
                  backgroundColor: brand,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 20,
                }}
              >
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>v{entry.version}</Text>
              </View>
              <Text style={{ fontSize: 12, color: textSecondary }}>{entry.date}</Text>
            </View>
            {entry.version === APP_VERSION && (
              <View style={{ backgroundColor: brand + '20', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 }}>
                <Text style={{ color: brand, fontSize: 10, fontWeight: '700' }}>CURRENT</Text>
              </View>
            )}
          </View>

          <View style={{ gap: 8 }}>
            {entry.changes.map((change, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: brand, marginTop: 6, flexShrink: 0 }} />
                <Text style={{ fontSize: 13, color: text, flex: 1, lineHeight: 18 }}>{change}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}

      {/* Update checker */}
      <UpdateChecker onCheck={checkForUpdate} />
    </View>
  )
}
