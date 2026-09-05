// update-banner.tsx — Global update state banner for the POS app
//
// Renders the current MobileUpdateManager state:
//   CURRENT          — green dot, "Up to date v{version}"
//   CHECKING        — spinner, "Checking for updates..."
//   DOWNLOADING     — progress ring, "Downloading update... {progress}%"
//   READY_TO_INSTALL — yellow banner, "Update ready" + "Install" button
//   INSTALLING      — spinner, "Installing update..."
//   ERROR           — red banner, error message + "Retry" button

import { useState, useEffect, useCallback } from 'react'
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native'
import { RefreshCw, CheckCircle2, AlertCircle, Download, ChevronRight } from 'lucide-react-native'
import { mobileUpdateManager, type UpdateInfo } from '../../services/adapters/updates/mobile-update-manager'
import { APP_VERSION } from '../../lib/constants'

interface UpdateBannerProps {
  /** Override the default "Install" action with a custom handler (e.g. defer to a sheet). */
  onInstall?: () => void
  /** Override the default "Retry" action. */
  onRetry?: () => void
}

export function UpdateBanner({ onInstall, onRetry }: UpdateBannerProps) {
  const [info, setInfo] = useState<UpdateInfo>(mobileUpdateManager.getCurrentState())

  useEffect(() => {
    return mobileUpdateManager.addListener(setInfo)
  }, [])

  const handleInstall = useCallback(() => {
    if (onInstall) { onInstall(); return }
    mobileUpdateManager.applyUpdate().catch(() => {/* already shown via state */})
  }, [onInstall])

  const handleRetry = useCallback(() => {
    if (onRetry) { onRetry(); return }
    mobileUpdateManager.checkForUpdates().catch(() => {/* already shown via state */})
  }, [onRetry])

  // Don't render anything when current and no update is pending
  if (info.state === 'CURRENT' && !info.availableVersion) return null

  return (
    <View style={[s.container, s[`state_${info.state}`]]}>
      {info.state === 'CURRENT' && (
        <CurrentBanner info={info} />
      )}
      {info.state === 'CHECKING' && (
        <CheckingBanner />
      )}
      {info.state === 'DOWNLOADING' && (
        <DownloadingBanner info={info} />
      )}
      {info.state === 'READY_TO_INSTALL' && (
        <ReadyBanner onInstall={handleInstall} info={info} />
      )}
      {info.state === 'INSTALLING' && (
        <InstallingBanner />
      )}
      {info.state === 'ERROR' && (
        <ErrorBanner info={info} onRetry={handleRetry} />
      )}
    </View>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CurrentBanner({ info }: { info: UpdateInfo }) {
  return (
    <View style={s.row}>
      <CheckCircle2 size={14} color="#22c55e" />
      <Text style={[s.text, { color: '#166534' }]}>
        Up to date
        {info.currentVersion ? ` v${info.currentVersion}` : ''}
      </Text>
    </View>
  )
}

function CheckingBanner() {
  return (
    <View style={s.row}>
      <ActivityIndicator size={12} color="#3b82f6" />
      <Text style={[s.text, { color: '#1e40af' }]}>Checking for updates...</Text>
    </View>
  )
}

function DownloadingBanner({ info }: { info: UpdateInfo }) {
  return (
    <View style={s.row}>
      <Download size={14} color="#7c3aed" />
      <Text style={[s.text, { color: '#5b21b6' }]}>
        Downloading update...
        {info.downloadProgress != null ? ` ${info.downloadProgress}%` : ''}
      </Text>
    </View>
  )
}

function ReadyBanner({ info, onInstall }: { info: UpdateInfo; onInstall: () => void }) {
  return (
    <View style={[s.row, s.readyRow]}>
      <View style={s.readyLeft}>
        <RefreshCw size={14} color="#ca8a04" />
        <Text style={[s.text, s.readyText]}>
          Update ready
          {info.availableVersion ? ` (v${info.availableVersion})` : ''}
        </Text>
      </View>
      <TouchableOpacity style={s.installBtn} onPress={onInstall} activeOpacity={0.7}>
        <Text style={s.installBtnText}>Install</Text>
        <ChevronRight size={12} color="#fff" />
      </TouchableOpacity>
    </View>
  )
}

function InstallingBanner() {
  return (
    <View style={s.row}>
      <ActivityIndicator size={12} color="#f97316" />
      <Text style={[s.text, { color: '#c2410c' }]}>Installing update...</Text>
    </View>
  )
}

function ErrorBanner({ info, onRetry }: { info: UpdateInfo; onRetry: () => void }) {
  return (
    <View style={[s.row, s.errorRow]}>
      <AlertCircle size={14} color="#ef4444" />
      <Text style={[s.text, s.errorText, { flex: 1 }]} numberOfLines={2}>
        {info.error ?? 'Update check failed'}
      </Text>
      <TouchableOpacity style={s.retryBtn} onPress={onRetry} activeOpacity={0.7}>
        <Text style={s.retryBtnText}>Retry</Text>
      </TouchableOpacity>
    </View>
  )
}

// ── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginHorizontal: 12,
    marginVertical: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  text: {
    fontSize: 13,
    fontWeight: '500',
  },
  // State tints
  state_CURRENT: { backgroundColor: '#dcfce7' },
  state_CHECKING: { backgroundColor: '#dbeafe' },
  state_DOWNLOADING: { backgroundColor: '#ede9fe' },
  state_READY_TO_INSTALL: { backgroundColor: '#fef9c3' },
  state_INSTALLING: { backgroundColor: '#ffedd5' },
  state_ERROR: { backgroundColor: '#fee2e2' },
  // Ready banner
  readyRow: { justifyContent: 'space-between' },
  readyLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  readyText: { color: '#854d0e', fontWeight: '600' },
  installBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ca8a04',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
  },
  installBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  // Error banner
  errorRow: { gap: 8 },
  errorText: { color: '#991b1b', fontSize: 12 },
  retryBtn: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 5,
  },
  retryBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },
})
