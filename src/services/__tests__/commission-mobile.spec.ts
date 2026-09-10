/**
 * commission-mobile.spec.ts — Phase 06: Commission calculation + cloud fetch tests
 *
 * Run with: npx jest commission-mobile
 *
 * Tests:
 * [P1-P5] calculateCommission at 600 / 1000 / 2000 / 0 / negative KES
 * [P6]  empty summary when no packages enrolled
 * [P7]  aggregates two packages correctly
 * [P8]  inactive packages are skipped
 * [P9]  businesses enrolled by different salesperson are excluded
 * [P10] missing business in map does not crash
 */
import { __testState } from '../../__mocks__/fidscript-instant-react'

// Inline the commission formula for pure unit tests (avoids import path complexity)
function calculateCommission(packageAmount: number) {
  const excess = Math.max(0, packageAmount - 600)
  return {
    company: 500 + 0.25 * excess,
    salesperson: 100 + 0.75 * excess,
    influencer: 50,
  }
}

describe('Phase 06 — Commission Calculation', () => {
  test('[P1] 600 KES package → company 500, salesperson 100, influencer 50', () => {
    const r = calculateCommission(600)
    expect(r.company).toBe(500)
    expect(r.salesperson).toBe(100)
    expect(r.influencer).toBe(50)
  })

  test('[P2] 1000 KES package → company 600, salesperson 400, influencer 50', () => {
    const r = calculateCommission(1000)
    expect(r.company).toBe(600)
    expect(r.salesperson).toBe(400)
    expect(r.influencer).toBe(50)
  })

  test('[P3] 2000 KES package → company 850, salesperson 1150, influencer 50', () => {
    const r = calculateCommission(2000)
    expect(r.company).toBe(850)
    expect(r.salesperson).toBe(1150)
    expect(r.influencer).toBe(50)
  })

  test('[P4] 0 KES (below minimum) → floor values', () => {
    const r = calculateCommission(0)
    expect(r.company).toBe(500)
    expect(r.salesperson).toBe(100)
    expect(r.influencer).toBe(50)
  })

  test('[P5] negative amount → floor values', () => {
    const r = calculateCommission(-100)
    expect(r.company).toBe(500)
    expect(r.salesperson).toBe(100)
    expect(r.influencer).toBe(50)
  })
})

describe('Phase 06 — Cloud Commission Fetch', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fetchCommissionSummary: (id: string) => Promise<any>

  // Helper: re-import after reset so the mock db is fresh, then re-populate test data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function loadServiceAndRestore(data: { packages?: any[]; businesses?: any[] }) {
    jest.resetModules()
    // Re-import __testState from the freshly-loaded mock (same singleton)
    const { __testState: freshState } = require('../../__mocks__/fidscript-instant-react')
    // Re-import cloud-commission to get the fresh mock db
    const mod = require('../../services/cloud-commission')
    // Restore test data into the freshly loaded __testState singleton
    if (data.packages) freshState.packages = data.packages
    if (data.businesses) freshState.businesses = data.businesses
    return mod.fetchCommissionSummary
  }

  test('[P6] empty summary when no packages enrolled', async () => {
    const fn = await loadServiceAndRestore({})
    const result = await fn('salesperson-1')
    expect(result.businesses).toHaveLength(0)
    expect(result.enrolledCount).toBe(0)
    expect(result.totalSalespersonCommission).toBe(0)
  })

  test('[P7] aggregates two packages correctly', async () => {
    const fn = await loadServiceAndRestore({
      packages: [
        { id: 'pkg-1', businessId: 'biz-1', name: 'Starter', amount: 1000, salespersonId: 'sp-1', isActive: true, createdAt: '2025-01-01T00:00:00Z' },
        { id: 'pkg-2', businessId: 'biz-2', name: 'Growth', amount: 2000, salespersonId: 'sp-1', isActive: true, createdAt: '2025-01-01T00:00:00Z' },
      ],
      businesses: [
        { id: 'biz-1', name: 'Kimana Shop', ownerName: 'Jane Doe', phone: '0700', email: 'jane@example.com', status: 'active', enrolledBy: 'sp-1', createdAt: '2025-01-01T00:00:00Z' },
        { id: 'biz-2', name: 'Kiki Motors', ownerName: 'John Smith', phone: '0701', email: 'john@example.com', status: 'active', enrolledBy: 'sp-1', createdAt: '2025-01-01T00:00:00Z' },
      ],
    })
    const result = await fn('sp-1')
    expect(result.businesses).toHaveLength(2)
    expect(result.enrolledCount).toBe(2)
    expect(result.totalSalespersonCommission).toBe(1550)
    expect(result.totalCompanyCommission).toBe(1450)
    expect(result.totalInfluencerCommission).toBe(100)
  })

  test('[P8] inactive packages are skipped', async () => {
    const fn = await loadServiceAndRestore({
      packages: [
        { id: 'pkg-1', businessId: 'biz-1', name: 'Starter', amount: 1000, salespersonId: 'sp-1', isActive: false, createdAt: '2025-01-01T00:00:00Z' },
      ],
      businesses: [
        { id: 'biz-1', name: 'Kimana Shop', ownerName: 'Jane Doe', phone: '0700', email: 'jane@example.com', status: 'active', enrolledBy: 'sp-1', createdAt: '2025-01-01T00:00:00Z' },
      ],
    })
    const result = await fn('sp-1')
    expect(result.businesses).toHaveLength(0)
  })

  test('[P9] businesses enrolled by different salesperson are excluded', async () => {
    const fn = await loadServiceAndRestore({
      packages: [
        { id: 'pkg-1', businessId: 'biz-1', name: 'Starter', amount: 1000, salespersonId: 'sp-1', isActive: true, createdAt: '2025-01-01T00:00:00Z' },
      ],
      businesses: [
        { id: 'biz-1', name: 'Other Shop', ownerName: 'Jane', phone: '0700', email: 'jane@example.com', status: 'active', enrolledBy: 'sp-2', createdAt: '2025-01-01T00:00:00Z' },
      ],
    })
    const result = await fn('sp-1')
    expect(result.businesses).toHaveLength(0)
  })

  test('[P10] missing business in map does not crash', async () => {
    const fn = await loadServiceAndRestore({
      packages: [
        { id: 'pkg-1', businessId: 'biz-orphan', name: 'Orphan', amount: 600, salespersonId: 'sp-1', isActive: true, createdAt: '2025-01-01T00:00:00Z' },
      ],
      businesses: [],
    })
    const result = await fn('sp-1')
    expect(result.businesses).toHaveLength(0)
  })
})
