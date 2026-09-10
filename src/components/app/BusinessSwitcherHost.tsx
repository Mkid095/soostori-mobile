// BusinessSwitcherHost.tsx — Phase 07: Global business switcher overlay
// Renders at root level so it's accessible from any screen.
// Controlled via BusinessContext (switcherVisible, openSwitcher, closeSwitcher).
import React from 'react'
import { BusinessSwitcherSheet } from '../../../app/business-switcher'
import { useActiveBusiness } from '../../hooks/BusinessContext'

export function BusinessSwitcherHost() {
  const { switcherVisible, closeSwitcher } = useActiveBusiness()
  return <BusinessSwitcherSheet visible={switcherVisible} onClose={closeSwitcher} />
}
