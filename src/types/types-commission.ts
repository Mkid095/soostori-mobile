// src/types/types-commission.ts
// Phase 06 — Commercial: commission types for salesperson commission display

export interface CommissionBreakdown {
  company: number
  salesperson: number
  influencer: number
}

/**
 * Commission formula (per brief, Cycle 05 Phase 06):
 *   Company_share     = 500 + 25% × max(0, packageAmount − 600)
 *   Salesperson_share = 100 + 75% × max(0, packageAmount − 600)
 *   Influencer_share  = 50 flat (paid BY COMPANY, not from client payment)
 */
export function calculateCommission(packageAmount: number): CommissionBreakdown {
  const excess = Math.max(0, packageAmount - 600)
  return {
    company: 500 + 0.25 * excess,
    salesperson: 100 + 0.75 * excess,
    influencer: 50,
  }
}

export interface EnrolledBusiness {
  id: string
  businessName: string
  packageName: string
  packageAmount: number
  commission: CommissionBreakdown
  status: 'active' | 'pending' | 'inactive'
}

export interface CommissionSummary {
  totalSalespersonCommission: number
  totalCompanyCommission: number
  totalInfluencerCommission: number
  enrolledCount: number
  businesses: EnrolledBusiness[]
}
