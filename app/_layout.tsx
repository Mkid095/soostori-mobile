// app/_layout.tsx — Root layout (thin wrapper)
import { RootLayoutContent } from '../src/components/app/root-layout-content'
import { BusinessProvider } from '../src/hooks/BusinessContext'

export default function RootLayout() {
  return <RootLayoutContent />
}
