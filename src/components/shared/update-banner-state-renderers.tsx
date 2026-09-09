// State renderers for update-banner sub-components
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native'
import { RefreshCw, ChevronRight } from 'lucide-react-native'
import type { UpdateStatus } from '../../services/adapters/updates/mobile-update-manager'

export function CheckingBanner() {
  return (
    <View style={s.row}>
      <ActivityIndicator size={12} color="#3b82f6" />
      <Text style={[s.text, { color: '#1e40af' }]}>Checking for updates...</Text>
    </View>
  )
}

export function AvailableBanner({ status, onDownload }: { status: UpdateStatus; onDownload: () => void }) {
  return (
    <View style={[s.row, s.readyRow]}>
      <View style={s.readyLeft}>
        <RefreshCw size={14} color="#ca8a04" />
        <Text style={[s.text, s.readyText]}>
          Update available{status.availableVersion ? ` v${status.availableVersion}` : ''}{status.updateType === 'binary' ? ' (full update)' : ''}
        </Text>
      </View>
      <TouchableOpacity style={s.installBtn} onPress={onDownload} activeOpacity={0.7}>
        <Text style={s.installBtnText}>Download</Text>
        <ChevronRight size={12} color="#fff" />
      </TouchableOpacity>
    </View>
  )
}

export function DownloadingBanner({ status }: { status: UpdateStatus }) {
  const pct = status.progress?.percent
  return (
    <View style={s.row}>
      <RefreshCw size={14} color="#7c3aed" />
      <Text style={[s.text, { color: '#5b21b6' }]}>Downloading update...{pct != null && !isNaN(pct) ? ` ${Math.round(pct)}%` : ''}</Text>
    </View>
  )
}

export function ReadyBanner({ status, onInstall }: { status: UpdateStatus; onInstall: () => void }) {
  return (
    <View style={[s.row, s.readyRow]}>
      <View style={s.readyLeft}>
        <RefreshCw size={14} color="#ca8a04" />
        <Text style={[s.text, s.readyText]}>Update ready{status.availableVersion ? ` (v${status.availableVersion})` : ''}</Text>
      </View>
      <TouchableOpacity style={s.installBtn} onPress={onInstall} activeOpacity={0.7}>
        <Text style={s.installBtnText}>Install</Text>
        <ChevronRight size={12} color="#fff" />
      </TouchableOpacity>
    </View>
  )
}

export function InstallingBanner() {
  return (
    <View style={s.row}>
      <ActivityIndicator size={12} color="#f97316" />
      <Text style={[s.text, { color: '#c2410c' }]}>Installing update...</Text>
    </View>
  )
}

export function ErrorBanner({ status, onRetry }: { status: UpdateStatus; onRetry: () => void }) {
  const message = status.error?.message ?? 'Update check failed'
  return (
    <View style={[s.row, s.errorRow]}>
      <Text style={[s.text, s.errorText, { flex: 1 }]} numberOfLines={2}>{message}</Text>
      <TouchableOpacity style={s.retryBtn} onPress={onRetry} activeOpacity={0.7}>
        <Text style={s.retryBtnText}>Retry</Text>
      </TouchableOpacity>
    </View>
  )
}

export function UnsupportedBanner({ status }: { status: UpdateStatus }) {
  return (
    <View style={[s.row, s.errorRow]}>
      <Text style={[s.text, s.errorText, { flex: 1 }]} numberOfLines={2}>
        {status.error?.message ?? 'This update is not supported on this device.'}
      </Text>
    </View>
  )
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  text: { fontSize: 13, fontWeight: '500' },
  readyRow: { justifyContent: 'space-between' },
  readyLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  readyText: { color: '#854d0e', fontWeight: '600' },
  installBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ca8a04', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 6, gap: 4 },
  installBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  errorRow: { gap: 8 },
  errorText: { color: '#991b1b', fontSize: 12 },
  retryBtn: { backgroundColor: '#ef4444', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 5 },
  retryBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },
})
