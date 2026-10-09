// @soostori/auth/permissions — local type stub for mobile
// Real permissions come from @soostori/auth package
// Re-export from package if available, otherwise use stubs

export interface Member {
  id?: string
  role: string
  permissions?: string[]
  memberCapabilityOverrides?: Record<string, boolean>
}

export function hasPermission(_member: Member | null, _capability: string): boolean {
  return true
}

export async function checkPermission(_member: Member | null, _capability: string): Promise<void> {
  return
}

export const CAPABILITIES = {} as Record<string, string>
