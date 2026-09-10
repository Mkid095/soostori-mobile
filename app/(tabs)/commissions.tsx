// app/(tabs)/commissions.tsx — Phase 06: My Commissions screen for salesperson role
// Accessible only to members with team.view capability.
// Displays enrolled businesses, package amounts, and calculated monthly commission.
// Commission formula:
//   Company_share     = 500 + 25% × max(0, packageAmount − 600)
//   Salesperson_share = 100 + 75% × max(0, packageAmount − 600)
//   Influencer_share  = 50 flat
import React from 'react'
import { View, Text, ScrollView, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { DollarSign, Building2, TrendingUp } from 'lucide-react-native'
import { useCommission } from '../../src/hooks/useCommission'
import { useTheme } from '../../src/hooks/useTheme'
import { AppHeader } from '../../src/components/shared/app-header'
import { formatCurrency } from '../../src/lib/formatters'

// Worked example table per the brief
const WORKED_EXAMPLES = [
  { package: 600, company: 500, salesperson: 100, influencer: 50 },
  { package: 1000, company: 550, salesperson: 400, influencer: 50 },
  { package: 2000, company: 850, salesperson: 1150, influencer: 50 },
]

export default function CommissionsScreen() {
  const { bg, card, text, textSecondary: textMuted, border, brand, success } = useTheme()
  const { summary, loading, error, visible } = useCommission()

  if (!visible) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>
        <AppHeader title="My Commissions" showBell={false} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <DollarSign size={48} color={textMuted} />
          <Text style={{ marginTop: 12, fontSize: 16, fontWeight: '600', color: textMuted, textAlign: 'center' }}>
            Commissions are only available for salespeople
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>
        <AppHeader title="My Commissions" showBell={false} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={brand} />
        </View>
      </SafeAreaView>
    )
  }

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>
        <AppHeader title="My Commissions" showBell={false} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Text style={{ color: '#ef4444', fontSize: 15, textAlign: 'center' }}>{error}</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['bottom']}>
      <AppHeader title="My Commissions" showBell={false} />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary card */}
        <View style={{ backgroundColor: brand + '12', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: brand + '30', marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: brand + '25', justifyContent: 'center', alignItems: 'center' }}>
              <DollarSign size={18} color={brand} />
            </View>
            <Text style={{ fontSize: 13, fontWeight: '700', color: brand, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Monthly Commission Estimate
            </Text>
          </View>
          <Text style={{ fontSize: 32, fontWeight: '900', color: text }}>
            {formatCurrency(summary?.totalSalespersonCommission ?? 0)}
          </Text>
          <Text style={{ color: textMuted, fontSize: 13, marginTop: 4 }}>
            from {summary?.enrolledCount ?? 0} enrolled business{summary?.enrolledCount !== 1 ? 's' : ''}
          </Text>
        </View>

        {/* Commission formula card */}
        <View style={{ backgroundColor: card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: border, marginBottom: 16 }}>
          <Text style={{ fontWeight: '800', fontSize: 14, color: text, marginBottom: 10 }}>
            How commission is calculated
          </Text>
          <Text style={{ fontSize: 12, color: textMuted, lineHeight: 18, marginBottom: 10 }}>
            Minimum package: <Text style={{ fontWeight: '700', color: text }}>600 KES/month</Text>
          </Text>
          <View style={{ backgroundColor: bg, borderRadius: 8, overflow: 'hidden' }}>
            <View style={{ flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: border }}>
              <Text style={{ flex: 1.5, fontSize: 11, fontWeight: '700', color: textMuted, textTransform: 'uppercase' }}>Package</Text>
              <Text style={{ flex: 1.5, fontSize: 11, fontWeight: '700', color: textMuted, textAlign: 'right', textTransform: 'uppercase' }}>Company</Text>
              <Text style={{ flex: 1.5, fontSize: 11, fontWeight: '700', color: textMuted, textAlign: 'right', textTransform: 'uppercase' }}>Salesperson</Text>
              <Text style={{ flex: 1.5, fontSize: 11, fontWeight: '700', color: textMuted, textAlign: 'right', textTransform: 'uppercase' }}>Influencer</Text>
            </View>
            {WORKED_EXAMPLES.map((row, i) => (
              <View key={row.package} style={{ flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 10, backgroundColor: i % 2 === 0 ? 'transparent' : bg + '80' }}>
                <Text style={{ flex: 1.5, fontSize: 13, fontWeight: '600', color: text }}>{formatCurrency(row.package).replace('.00', '')}</Text>
                <Text style={{ flex: 1.5, fontSize: 13, color: textMuted, textAlign: 'right' }}>{formatCurrency(row.company).replace('.00', '')}</Text>
                <Text style={{ flex: 1.5, fontSize: 13, fontWeight: '600', color: success, textAlign: 'right' }}>{formatCurrency(row.salesperson).replace('.00', '')}</Text>
                <Text style={{ flex: 1.5, fontSize: 13, color: textMuted, textAlign: 'right' }}>{formatCurrency(row.influencer).replace('.00', '')}</Text>
              </View>
            ))}
          </View>
          <View style={{ marginTop: 10, gap: 4 }}>
            <Text style={{ fontSize: 11, color: textMuted }}>
              • <Text style={{ fontWeight: '600', color: text }}>Company</Text>: 500 + 25% × max(0, amount − 600)
            </Text>
            <Text style={{ fontSize: 11, color: textMuted }}>
              • <Text style={{ fontWeight: '600', color: text }}>Salesperson</Text>: 100 + 75% × max(0, amount − 600)
            </Text>
            <Text style={{ fontSize: 11, color: textMuted }}>
              • <Text style={{ fontWeight: '600', color: text }}>Influencer</Text>: 50 flat (paid by company)
            </Text>
          </View>
        </View>

        {/* Enrolled businesses */}
        <Text style={{ fontSize: 13, fontWeight: '700', color: textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
          Enrolled Businesses
        </Text>

        {summary?.businesses.length === 0 ? (
          <View style={{ backgroundColor: card, borderRadius: 14, padding: 24, borderWidth: 1, borderColor: border, alignItems: 'center' }}>
            <Building2 size={32} color={textMuted} />
            <Text style={{ marginTop: 10, fontWeight: '600', color: textMuted, fontSize: 14 }}>
              No businesses enrolled yet
            </Text>
            <Text style={{ marginTop: 4, fontSize: 12, color: textMuted, textAlign: 'center' }}>
              Use the Web portal to enroll clients and assign packages
            </Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {summary?.businesses.map((biz) => (
              <View
                key={biz.id}
                style={{ backgroundColor: card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: border }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: brand + '15', justifyContent: 'center', alignItems: 'center' }}>
                    <Building2 size={16} color={brand} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={{ fontWeight: '700', fontSize: 14, color: text }}>{biz.businessName}</Text>
                    <Text style={{ fontSize: 12, color: textMuted, marginTop: 2 }}>{biz.packageName}</Text>
                  </View>
                  <View style={{ backgroundColor: success + '18', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, alignItems: 'center' }}>
                    <Text style={{ fontWeight: '800', fontSize: 16, color: success }}>
                      {formatCurrency(biz.commission.salesperson).replace('.00', '')}
                    </Text>
                    <Text style={{ fontSize: 10, color: success, fontWeight: '600' }}>/month</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8, borderTopWidth: 1, borderTopColor: border }}>
                  <View>
                    <Text style={{ fontSize: 11, color: textMuted }}>Package</Text>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: text }}>{formatCurrency(biz.packageAmount).replace('.00', '')}/mo</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 11, color: textMuted }}>Company share</Text>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: textMuted }}>{formatCurrency(biz.commission.company).replace('.00', '')}/mo</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 11, color: textMuted }}>Influencer</Text>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: textMuted }}>{formatCurrency(biz.commission.influencer).replace('.00', '')}/mo</Text>
                  </View>
                </View>
                <View style={{ marginTop: 8 }}>
                  <View style={{
                    backgroundColor: biz.status === 'active' ? success + '15' : brand + '15',
                    borderRadius: 6,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    alignSelf: 'flex-start',
                  }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: biz.status === 'active' ? success : brand, textTransform: 'uppercase' }}>
                      {biz.status}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
