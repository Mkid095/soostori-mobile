// src/services/cloud-commission.ts
// Phase 06 — Commercial: fetch enrolled businesses and packages from cloud (instant-self MCP)
// for the My Commissions screen.
import { db } from '../lib/instant-client'
import { calculateCommission, type CommissionSummary, type EnrolledBusiness } from '../types/types-commission'

// Query businesses and packages where the given employeeId is the enrolling salesperson.
// Returns a CommissionSummary aggregated from cloud data.
export async function fetchCommissionSummary(salespersonId: string): Promise<CommissionSummary> {
  // Query packages enrolled by this salesperson
  const pkgResult = await db.queryOnce({
    packages: { $: { where: { salespersonId } } },
  })

  // Query all businesses (filter client-side by enrolledBy)
  const bizResult = await db.queryOnce({ businesses: { $: {} } })

  const packages = (pkgResult.data.packages as Array<{
    id: string
    businessId: string
    name: string
    amount: number
    salespersonId: string
    isActive: boolean
    createdAt: string
  }>) || []

  const allBusinesses = (bizResult.data.businesses as Array<{
    id: string
    name: string
    ownerName: string
    phone: string
    email: string
    status: string
    enrolledBy: string
    createdAt: string
  }>) || []

  // Map businessId → business for quick lookup
  const businessMap = new Map<string, typeof allBusinesses[0]>()
  for (const biz of allBusinesses) {
    businessMap.set(biz.id, biz)
  }

  const businesses: EnrolledBusiness[] = []
  let totalSalesperson = 0
  let totalCompany = 0
  let totalInfluencer = 0

  for (const pkg of packages) {
    if (!pkg.isActive) continue
    const biz = businessMap.get(pkg.businessId)
    if (!biz || biz.enrolledBy !== salespersonId) continue

    const commission = calculateCommission(pkg.amount)
    businesses.push({
      id: biz.id,
      businessName: biz.name,
      packageName: pkg.name,
      packageAmount: pkg.amount,
      commission,
      status: biz.status === 'active' ? 'active' : biz.status === 'pending' ? 'pending' : 'inactive',
    })
    totalSalesperson += commission.salesperson
    totalCompany += commission.company
    totalInfluencer += commission.influencer
  }

  return {
    totalSalespersonCommission: totalSalesperson,
    totalCompanyCommission: totalCompany,
    totalInfluencerCommission: totalInfluencer,
    enrolledCount: businesses.length,
    businesses,
  }
}
