// Debt Management screen — two tab views: Debts list and Customers list
// Business logic in services; component only handles UI state and rendering.
import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '../../src/hooks/useTheme'
import type { Debt, Customer } from '../../src/lib/types'
import { useDebts } from '../../src/hooks/useDebts'
import { useCustomers } from '../../src/hooks/useCustomers'
import { DebtListSection } from '../../src/components/debt/debt-list-section'
import { CustomerListSection } from '../../src/components/debt/customer-list-section'
import { DebtPartialPaymentModal } from '../../src/components/shared/debt-partial-payment-modal'
import { DebtDetailModal } from '../../src/components/shared/debt-detail-modal'
import { AddCustomerModal } from '../../src/components/shared/add-customer-modal'
import { RecordNewDebtModal } from '../../src/components/shared/record-new-debt-modal'
import { AppHeader } from '../../src/components/shared/app-header'

type Tab = 'debts' | 'customers'

export default function DebtScreen() {
  const { bg, card, text, border, brand: orange } = useTheme()
  const [tab, setTab] = useState<Tab>('debts')
  const { debts, loadDebts } = useDebts()
  const { customers, loadCustomers } = useCustomers()

  // Modal states
  const [partialTarget, setPartialTarget] = useState<Debt | null>(null)
  const [detailDebt, setDetailDebt] = useState<Debt | null>(null)
  const [showAddCustomer, setShowAddCustomer] = useState(false)
  const [recordDebtCustomer, setRecordDebtCustomer] = useState<Customer | null>(null)

  useEffect(() => {
    loadDebts()
    loadCustomers()
  }, [loadDebts, loadCustomers])

  async function handleDebtDetail(debt: Debt) {
    const full = await loadDebtById(debt.id)
    if (full) setDetailDebt(full)
  }

  async function loadDebtById(id: string): Promise<Debt | null> {
    const { getDebtById } = await import('../../src/services/db-debts')
    return getDebtById(id)
  }

  const tabBg = (t: Tab) => (tab === t ? orange : 'transparent')
  const tabColor = (t: Tab) => (tab === t ? '#fff' : text)

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['bottom']}>
      <AppHeader title="Debt Management" />

      {/* Tab switcher */}
      <View
        style={{
          flexDirection: 'row', marginHorizontal: 12, marginTop: 8, borderRadius: 10,
          padding: 4, backgroundColor: card, borderWidth: 1, borderColor: border,
        }}
      >
        {(['debts', 'customers'] as Tab[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={{ flex: 1, borderRadius: 8, paddingVertical: 10, alignItems: 'center', backgroundColor: tabBg(t) }}
            onPress={() => setTab(t)}
          >
            <Text style={{ color: tabColor(t), fontWeight: '800', fontSize: 14, textTransform: 'capitalize' }}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'debts' ? (
        <DebtListSection
          debts={debts}
          onRefresh={loadDebts}
          onRecordPayment={setPartialTarget}
          onDebtPress={handleDebtDetail}
        />
      ) : (
        <CustomerListSection
          customers={customers}
          onRefresh={loadCustomers}
          onAddCustomer={() => setShowAddCustomer(true)}
          onRecordDebt={setRecordDebtCustomer}
        />
      )}

      {/* Modals */}
      <DebtPartialPaymentModal debt={partialTarget} onClose={() => setPartialTarget(null)} onPaid={loadDebts} />
      <DebtDetailModal debt={detailDebt} onClose={() => setDetailDebt(null)} onRecordPayment={setPartialTarget} />
      <AddCustomerModal visible={showAddCustomer} onClose={() => setShowAddCustomer(false)} onCreated={loadCustomers} />
      <RecordNewDebtModal customer={recordDebtCustomer} onClose={() => setRecordDebtCustomer(null)} onCreated={loadDebts} />
    </SafeAreaView>
  )
}
