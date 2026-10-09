// UpdateChecker — "check for updates" button in About/Changelog section
// Uses expo-updates (expo-updates) for OTA update checking and deployment.
import { useState } from 'react'
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native'
import * as Updates from 'expo-updates'
import { useTheme } from '../../hooks/useTheme'
import { APP_VERSION } from '../../lib/constants'

export type UpdateStatus = 'current' | 'available' | 'checking' | 'downloading' | 'reloading' | 'error'

interface UpdateCheckerProps {
  /** Called when user taps "Check for Updates" — wire this to your OTA check logic */
  onCheck: () => Promise<{ latestVersion: string; downloadUrl?: string } | null>
}

/**
 * Checks for a new OTA update using expo-updates.
 * Returns null if already on the latest version (no update available).
 * Returns { latestVersion } if an update is available (manifest is available from the server).
 * Throws if expo-updates is disabled, network is unavailable, or another error occurs.
 */
export async function checkForUpdate(): Promise<{ latestVersion: string } | null> {
  const result = await Updates.checkForUpdateAsync()
  if (!result.isAvailable) {
    return null
  }
  // The manifest's metadata contains the new version string.
  // expo-updates serves the runtime version from app.json/app.config — we use
  // the manifest's version or fall back to the runtime version.
  const manifest = result.manifest
  const latestVersion =
    typeof manifest === 'object' && manifest != null && typeof (manifest as Record<string, unknown>).version === 'string'
      ? String((manifest as Record<string, unknown>).version)
      : Updates.runtimeVersion ?? APP_VERSION
  return { latestVersion }
}

/**
 * Downloads and applies a pending OTA update.
 * Shows a reload prompt after successful download, then reloads.
 * Throws if no update has been fetched or network is unavailable.
 */
export async function downloadAndReload(): Promise<void> {
  await Updates.fetchUpdateAsync()
  // Show confirmation before reloading — the reload promise resolves before the app actually exits.
  Alert.alert(
    'Update Ready',
    'The update has been downloaded. The app will now restart to apply it.',
    [{ text: 'Restart Now', onPress: () => Updates.reloadAsync() }],
    { cancelable: false },
  )
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
      // Prefer the injected onCheck if provided; fall back to the expo-updates implementation.
      const result = onCheck !== undefined ? await onCheck() : await checkForUpdate()
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

  async function handleDownload() {
    setStatus('downloading')
    setError(null)
    try {
      await downloadAndReload()
      setStatus('reloading')
    } catch (e) {
      setStatus('error')
      setError(String(e))
    }
  }

  const isLoading = status === 'checking' || status === 'downloading' || status === 'reloading'

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
              : status === 'downloading' ? 'Downloading...'
              : status === 'reloading' ? 'Restarting...'
              : status === 'available' ? `v${latestVersion} available`
              : status === 'error' ? 'Error'
              : 'Up to date'}
          </Text>
        </View>
      </View>

      {status === 'available' ? (
        <TouchableOpacity
          style={{ backgroundColor: success, borderRadius: 10, paddingVertical: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
          onPress={handleDownload}
        >
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>Download & Restart</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={{ backgroundColor: brand, borderRadius: 10, paddingVertical: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
          onPress={handleCheck}
          disabled={isLoading}
        >
          {status === 'checking' ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>Check for Updates</Text>
          )}
        </TouchableOpacity>
      )}

      {status === 'available' && (
        <Text style={{ fontSize: 11, color: textMuted, marginTop: 8, textAlign: 'center' }}>
          A new version ({latestVersion}) is ready to download and install.
        </Text>
      )}
      {status === 'error' && (
        <Text style={{ fontSize: 11, color: danger, marginTop: 8, textAlign: 'center' }}>
          {error}
        </Text>
      )}
      <Text style={{ fontSize: 10, color: textMuted, marginTop: 8, textAlign: 'center' }}>
        Updates are delivered automatically when connected to the internet.
      </Text>
    </View>
  )
}
