// @soostori/auth — runtime mock for jest (CJS).
// Provides the minimal surface that mobile SDK code needs in tests.
// Default implementations: no-op permission checks that always succeed.

import type { Member } from '@soostori/auth/permissions'

export function hasPermission(_member: Member | null, _capability: string): boolean {
  return true
}

export function checkPermission(_member: Member | null, _capability: string): Promise<void> {
  return Promise.resolve()
}

export const CAPABILITIES = {} as Record<string, string>

export function getCapabilitiesForRole(_role: string): string[] {
  return []
}
