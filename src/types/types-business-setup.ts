// types-business-setup.ts — Phase 07: Business Setup types
// Used across the Business Setup screen, service, and hook.

export type BusinessType = 'retail' | 'wholesale' | 'supermarket' | 'restaurant' | 'salon' | 'pharmacy' | 'other'

export interface BusinessSetupInput {
  businessName: string
  businessType: BusinessType
  country: string       // ISO 3166-1 alpha-2, default 'KE'
  currency: string      // ISO 4217, default 'KES'
  ownerName: string
  ownerEmail?: string
  ownerPhone: string    // E.164 format
}

export interface BusinessSetupResult {
  businessId: string
  ownerMembershipId: string
  defaultCategoryId: string
}

export interface BusinessListItem {
  id: string
  name: string
  type: BusinessType
  country: string
  currency: string
  memberCount: number
  createdAt: string
}
