/**
 * cloud-auth-backend.person-not-found.test.ts
 *
 * Verifies the §17/§84 fix: when an authenticated person has no existing
 * Soostori membership (no `employees` row for their email), both
 * `cloudVerifyMagicCode` and `cloudExchangeGoogleToken` return
 * `{ ok: false, code: 'PERSON_NOT_FOUND' }` AND do NOT create a shop.
 *
 * Run with: npx jest cloud-auth-backend.person-not-found
 */

import { __testState } from '../../__mocks__/fidscript-instant-react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const backend = require('../../services/cloud-auth-backend') as any

describe('cloud-auth-backend §17/§84 PERSON_NOT_FOUND', () => {
  beforeEach(() => {
    __testState.reset()
  })

  test('[1] cloudVerifyMagicCode returns ok:false when no membership exists', async () => {
    const result = await backend.cloudVerifyMagicCode('newperson@example.com', '123456')
    expect(result.ok).toBe(false)
    expect(result.code).toBe('PERSON_NOT_FOUND')
    expect(__testState.shopCreateCount).toBe(0)
    expect(__testState.deviceCreateCount).toBe(0)
  })

  test('[2] cloudExchangeGoogleToken returns ok:false when no membership exists', async () => {
    const result = await backend.cloudExchangeGoogleToken('id_token_abc')
    expect(result.ok).toBe(false)
    expect(result.code).toBe('PERSON_NOT_FOUND')
    expect(__testState.shopCreateCount).toBe(0)
    expect(__testState.deviceCreateCount).toBe(0)
  })

  test('[3] existing membership returns ok:true without auto-creating a shop', async () => {
    __testState.employees = [
      { id: 'emp_existing_1', shopId: 'shop_existing_1', email: 'returning@example.com', role: 'owner' },
    ]
    __testState.shops = [
      { id: 'shop_existing_1', name: 'Existing Shop', slug: 'existing-shop', plan: 'pro', status: 'active' },
    ]
    const result = await backend.cloudVerifyMagicCode('returning@example.com', '654321')
    expect(result.ok).toBe(true)
    expect(result.response.user.email).toBe('returning@example.com')
    expect(result.response.shop.id).toBe('shop_existing_1')
    expect(result.response.shop.plan).toBe('pro')
    expect(__testState.shopCreateCount).toBe(0)
    expect(__testState.deviceCreateCount).toBe(0)
  })

  test('[4] Google path with existing membership returns ok:true without auto-creating', async () => {
    __testState.employees = [
      { id: 'emp_google_1', shopId: 'shop_google_1', email: 'goog@example.com', role: 'manager' },
    ]
    __testState.shops = [
      { id: 'shop_google_1', name: 'Google Shop', slug: 'google-shop', plan: 'free', status: 'active' },
    ]
    const result = await backend.cloudExchangeGoogleToken('id_token_xyz')
    expect(result.ok).toBe(true)
    expect(result.response.user.type).toBe('manager')
    expect(result.response.shop.name).toBe('Google Shop')
    expect(__testState.shopCreateCount).toBe(0)
  })

  test('[5] repeat PERSON_NOT_FOUND calls do not auto-create (regression)', async () => {
    await backend.cloudVerifyMagicCode('never@example.com', '111111')
    await backend.cloudVerifyMagicCode('never@example.com', '222222')
    await backend.cloudExchangeGoogleToken('id_token_never_1')
    await backend.cloudExchangeGoogleToken('id_token_never_2')
    expect(__testState.shopCreateCount).toBe(0)
    expect(__testState.deviceCreateCount).toBe(0)
  })

  test('[6] shop with missing referenced id is treated as PERSON_NOT_FOUND', async () => {
    // employee exists but its shopId does not — defensive fail-closed
    __testState.employees = [
      { id: 'emp_orphan', shopId: 'shop_orphan', email: 'orphan@example.com', role: 'attendant' },
    ]
    // shops is empty
    const result = await backend.cloudVerifyMagicCode('orphan@example.com', '123456')
    expect(result.ok).toBe(false)
    expect(result.code).toBe('PERSON_NOT_FOUND')
    expect(__testState.shopCreateCount).toBe(0)
  })

  // The UNAUTHORIZED_LOGIN_CONTACT_PHONE constant reachability is verified
  // at TypeScript compile time (see person-not-found-screen.tsx import).
  // Jest ESM/SDK packaging is a SDK-side concern, not a mobile-side runtime.
})
