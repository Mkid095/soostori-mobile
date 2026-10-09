// Type declaration for @soostori/auth/permissions module
// Re-exports from local permissions stub

export interface Member {
  id?: string
  role: string
  permissions?: string[]
}

export function hasPermission(_member: Member | null, _capability: string): boolean {
  return true
}

export async function checkPermission(_member: Member | null, _capability: string): Promise<void> {
  return
}

export const CAPABILITIES = {} as Record<string, string>
