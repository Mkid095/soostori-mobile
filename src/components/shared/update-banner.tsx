// update-banner.tsx — Global update state banner
// States: CURRENT, CHECKING, UPDATE_AVAILABLE, DOWNLOADING, READY_TO_INSTALL, INSTALLING, ERROR, UNSUPPORTED
import { useCallback } from 'react'
import { View, StyleSheet } from 'react-native'
import { useUpdateChecker } from '../../hooks/useUpdateChecker'
import { mobileUpdateManager } from '../../services/adapters/updates/mobile-update-manager'
import { CheckingBanner, AvailableBanner, DownloadingBanner, ReadyBanner, InstallingBanner, ErrorBanner, UnsupportedBanner } from './update-banner-state-renderers'

interface UpdateBannerProps {
  onDownload?: () => void
  onInstall?: () => void
  onRetry?: () => void
}

export function UpdateBanner({ onDownload, onInstall, onRetry }: UpdateBannerProps) {
  const status = useUpdateChecker()

  const handleDownload = useCallback(() => {
    if (onDownload) { onDownload(); return }
    mobileUpdateManager.downloadUpdate().catch(() => {})
  }, [onDownload])

  const handleInstall = useCallback(() => {
    if (onInstall) { onInstall(); return }
    mobileUpdateManager.installUpdate().catch(() => {})
  }, [onInstall])

  const handleRetry = useCallback(() => {
    if (onRetry) { onRetry(); return }
    mobileUpdateManager.checkForUpdate().catch(() => {})
  }, [onRetry])

  if (status.state === 'CURRENT') return null

  return (
    <View style={[s.container, (s as any)[`state_${status.state}`]]}>
      {status.state === 'CHECKING' && <CheckingBanner />}
      {status.state === 'UPDATE_AVAILABLE' && <AvailableBanner status={status} onDownload={handleDownload} />}
      {status.state === 'DOWNLOADING' && <DownloadingBanner status={status} />}
      {status.state === 'READY_TO_INSTALL' && <ReadyBanner status={status} onInstall={handleInstall} />}
      {status.state === 'INSTALLING' && <InstallingBanner />}
      {status.state === 'ERROR' && <ErrorBanner status={status} onRetry={handleRetry} />}
      {status.state === 'UNSUPPORTED' && <UnsupportedBanner status={status} />}
    </View>
  )
}

const s = StyleSheet.create({
  container: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginHorizontal: 12, marginVertical: 4 },
  state_CURRENT: { backgroundColor: '#dcfce7' },
  state_CHECKING: { backgroundColor: '#dbeafe' },
  state_UPDATE_AVAILABLE: { backgroundColor: '#fef9c3' },
  state_DOWNLOADING: { backgroundColor: '#ede9fe' },
  state_READY_TO_INSTALL: { backgroundColor: '#fef9c3' },
  state_INSTALLING: { backgroundColor: '#ffedd5' },
  state_ERROR: { backgroundColor: '#fee2e2' },
  state_UNSUPPORTED: { backgroundColor: '#fff7ed' },
})
