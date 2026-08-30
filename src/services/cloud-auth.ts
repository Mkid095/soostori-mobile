// Cloud authentication service — stub until sync-contract.md is defined
// NOTE: These functions MUST be implemented with real HTTPS calls to the Soostori Cloud API
// once docs/sync-contract.md is defined by the web team.
// Currently throws an error indicating the contract is not yet defined.

import type { CloudAuthResponse, SubscriptionEntitlement } from '../contracts/cloud'

export async function cloudLogin(
  _email: string,
  _password: string
): Promise<CloudAuthResponse> {
  throw new Error('Cloud API not yet defined — pending sync-contract.md from web team')
}

export async function cloudRegister(
  _email: string,
  _password: string,
  _phone?: string
): Promise<CloudAuthResponse> {
  throw new Error('Cloud API not yet defined — pending sync-contract.md from web team')
}

export async function cloudVerifySubscription(_shopId: string): Promise<SubscriptionEntitlement> {
  throw new Error('Cloud API not yet defined — pending sync-contract.md from web team')
}

export async function cloudRefreshToken(_token: string): Promise<{ token: string; expiresAt: string }> {
  throw new Error('Cloud API not yet defined — pending sync-contract.md from web team')
}

export async function cloudGetServerTime(): Promise<string> {
  throw new Error('Cloud API not yet defined — pending sync-contract.md from web team')
}
