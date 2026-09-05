// update-banner.tsx — Global update state banner for the POS app
//
// Renders the canonical SDK UpdateStatus states:
//   CURRENT          — green dot, "Up to date v{version}"
//   CHECKING        — spinner, "Checking for updates..."
//   UPDATE_AVAILABLE — yellow banner, "Update available v{version}" + "Download" button
//   DOWNLOADING     — progress ring, "Downloading update... {progress}%"
//   READY_TO_INSTALL — yellow banner, "Update ready" + "Install" button
//   INSTALLING      — spinner, "Installing update..."
//   ERROR           — red banner, error message + "Retry" button
//   UNSUPPORTED     — orange banner, "Update not supported on this platform"

import { useState, useEffect, useCallback } from 'react'
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native'
import { RefreshCw, CheckCircle2, AlertCircle, Download, ChevronRight } from 'lucide-react-native'
import { mobileUpdateManager, type UpdateStatus } from '../../services/adapters/updates/mobile-update-manager'
import { APP_VERSION } from '../../lib/constants'

interface UpdateBannerProps {
  /** Override the default "Download" action for UPDATE_AVAILABLE. */
  onDownload?: () => void
  /** Override the default "Install" action for READY_TO_INSTALL. */
  onInstall?: () => void
  /** Override the default "Retry" action for ERROR. */
  onRetry?: () => void
}

export function UpdateBanner({ onDownload, onInstall, onRetry }: UpdateBannerProps) {
  const [status, setStatus] = useState<UpdateStatus>({
    state: 'CURRENT',
    currentVersion: APP_VERSION as any,
    requiresRestart: false,
    lastCheckedAt: null,
    installedAt: null,
  })

  useEffect(() => {
    return mobileUpdateManager.addListener((s) => setStatus(s))
  }, [])

  const handleDownload = useCallback(() => {
    if (onDownload) { onDownload(); return }
    mobileUpdateManager.downloadUpdate().catch(() => {/* already shown via state */})
  }, [onDownload])

  const handleInstall = useCallback(() => {
    if (onInstall) { onInstall(); return }
    mobileUpdateManager.installUpdate().catch(() => {/* already shown via state */})
  }, [onInstall])

  const handleRetry = useCallback(() => {
    if (onRetry) { onRetry(); return }
    mobileUpdateManager.checkForUpdate().catch(() => {/* already shown via state */})
  }, [onRetry])

  // Nothing to show when current and no update is pending
  if (status.state === 'CURRENT') return null

  return (
    <View style={[s.container, (s as any)[`state_${status.state}`]]}>
      {status.state === 'CHECKING' && <CheckingBanner />}
      {status.state === 'UPDATE_AVAILABLE' && (
        <AvailableBanner status={status} onDownload={handleDownload} />
      )}
      {status.state === 'DOWNLOADING' && <DownloadingBanner status={status} />}
      {status.state === 'READY_TO_INSTALL' && (
        <ReadyBanner status={status} onInstall={handleInstall} />
      )}
      {status.state === 'INSTALLING' && <InstallingBanner />}
      {status.state === 'ERROR' && <ErrorBanner status={status} onRetry={handleRetry} />}
      {status.state === 'UNSUPPORTED' && <UnsupportedBanner status={status} />}
    </View>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CheckingBanner() {
  return (
    <View style={s.row}>
      <ActivityIndicator size={12} color="#3b82f6" />
      <Text style={[s.text, { color: '#1e40af' }]}>Checking for updates...</Text>
    </View>
  )
}

function AvailableBanner({ status, onDownload }: { status: UpdateStatus; onDownload: () => void }) {
  return (
    <View style={[s.row, s.readyRow]}>
      <View style={s.readyLeft}>
        <RefreshCw size={14} color="#ca8a04" />
        <Text style={[s.text, s.readyText]}>
          Update available
          {status.availableVersion ? ` v${status.availableVersion}` : ''}
          {status.updateType === 'binary' ? ' (full update)' : ''}
        </Text>
      </View>
      <TouchableOpacity style={s.installBtn} onPress={onDownload} activeOpacity={0.7}>
        <Text style={s.installBtnText}>Download</Text>
        <ChevronRight size={12} color="#fff" />
      </TouchableOpacity>
    </View>
  )
}

function DownloadingBanner({ status }: { status: UpdateStatus }) {
  const pct = status.progress?.percent
  return (
    <View style={s.row}>
      <Download size={14} color="#7c3aed" />
      <Text style={[s.text, { color: '#5b21b6' }]}>
        Downloading update...
        {pct != null && !isNaN(pct) ? ` ${Math.round(pct)}%` : ''}
      </Text>
    </View>
  )
}

function ReadyBanner({ status, onInstall }: { status: UpdateStatus; onInstall: () => void }) {
  return (
    <View style={[s.row, s.readyRow]}>
      <View style={s.readyLeft}>
        <RefreshCw size={14} color="#ca8a04" />
        <Text style={[s.text, s.readyText]}>
          Update ready
          {status.availableVersion ? ` (v${status.availableVersion})` : ''}
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

function ErrorBanner({ status, onRetry }: { status: UpdateStatus; onRetry: () => void }) {
  const message = status.error?.message ?? 'Update check failed'
  return (
    <View style={[s.row, s.errorRow]}>
      <AlertCircle size={14} color="#ef4444" />
      <Text style={[s.text, s.errorText, { flex: 1 }]} numberOfLines={2}>
        {message}
      </Text>
      <TouchableOpacity style={s.retryBtn} onPress={onRetry} activeOpacity={0.7}>
        <Text style={s.retryBtnText}>Retry</Text>
      </TouchableOpacity>
    </View>
  )
}

function UnsupportedBanner({ status }: { status: UpdateStatus }) {
  return (
    <View style={[s.row, s.errorRow]}>
      <AlertCircle size={14} color="#ea580c" />
      <Text style={[s.text, s.errorText, { flex: 1 }]} numberOfLines={2}>
        {status.error?.message ?? 'This update is not supported on this device.'}
      </Text>
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
  state_UPDATE_AVAILABLE: { backgroundColor: '#fef9c3' },
  state_DOWNLOADING: { backgroundColor: '#ede9fe' },
  state_READY_TO_INSTALL: { backgroundColor: '#fef9c3' },
  state_INSTALLING: { backgroundColor: '#ffedd5' },
  state_ERROR: { backgroundColor: '#fee2e2' },
  state_UNSUPPORTED: { backgroundColor: '#fff7ed' },
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
