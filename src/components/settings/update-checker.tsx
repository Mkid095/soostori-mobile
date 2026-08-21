// UpdateChecker — "check for updates" button in About/Changelog section
// The actual update-check logic (OTA, GitHub releases, etc.) is implemented separately.
// This component provides the UI shell: shows current version, checks and reports status.
import { useState } from 'react'
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useTheme } from '../../hooks/useTheme'
import { APP_VERSION } from '../../lib/constants'

export type UpdateStatus = 'current' | 'available' | 'checking' | 'error'

interface UpdateCheckerProps {
  /** Called when user taps "Check for Updates" — wire this to your OTA check logic */
  onCheck: () => Promise<{ latestVersion: string; downloadUrl?: string } | null>
}

/** Call this from onCheck to determine if an update is available */
export async function checkForUpdate(): Promise<{ latestVersion: string; downloadUrl?: string } | null> {
  // TODO (teammates): implement actual update check
  // e.g. call your backend, check GitHub releases API, or use expo-updates
  // Return null if already on latest version
  // Return { latestVersion, downloadUrl } if update available
  return null
}

export function UpdateChecker({ onCheck }: UpdateCheckerProps) {
  const { card, text, textSecondary: textMuted, border, brand, success, danger } = useTheme()
  const [status, setStatus] = useState<UpdateStatus>('current')
  const [latestVersion, setLatestVersion] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleCheck() {
    setStatus('checking')
    setError(null)
    try {
      const result = await onCheck()
      if (!result) {
        setStatus('current')
        setLatestVersion(null)
      } else {
        setLatestVersion(result.latestVersion)
        setStatus(result.latestVersion !== APP_VERSION ? 'available' : 'current')
      }
    } catch (e) {
      setStatus('error')
      setError(String(e))
    }
  }

  return (
    <View style={{ backgroundColor: card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: border }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <View>
          <Text style={{ fontSize: 13, fontWeight: '700', color: text }}>App Version</Text>
          <Text style={{ fontSize: 12, color: textMuted, marginTop: 2 }}>Version {APP_VERSION}</Text>
        </View>
        <View
          style={{
            backgroundColor: status === 'available' ? success : brand,
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 20,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>
            {status === 'checking' ? 'Checking...'
              : status === 'available' ? `v${latestVersion} available`
              : status === 'error' ? 'Error'
              : 'Up to date'}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={{ backgroundColor: brand, borderRadius: 10, paddingVertical: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
        onPress={handleCheck}
        disabled={status === 'checking'}
      >
        {status === 'checking'
          ? <ActivityIndicator color="#fff" size="small" />
          : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>Check for Updates</Text>
        }
      </TouchableOpacity>

      {status === 'available' && (
        <Text style={{ fontSize: 11, color: textMuted, marginTop: 8, textAlign: 'center' }}>
          A new version ({latestVersion}) is available. Update coming soon.
        </Text>
      )}
      {status === 'error' && (
        <Text style={{ fontSize: 11, color: danger, marginTop: 8, textAlign: 'center' }}>
          Could not check for updates. {error}
        </Text>
      )}
      <Text style={{ fontSize: 10, color: textMuted, marginTop: 8, textAlign: 'center' }}>
        Updates are delivered automatically when connected to the internet.
      </Text>
    </View>
  )
}
