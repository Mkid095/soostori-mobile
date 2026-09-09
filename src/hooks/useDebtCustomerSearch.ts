// useDebtCustomerSearch.ts — Customer search and creation for debt checkout
import { useState, useCallback } from 'react'
import type { Customer } from '../lib/types'
import { searchCustomers, createCustomer } from '../services/db-customers'

export function useDebtCustomerSearch() {
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerResults, setCustomerResults] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newCustomerPhone, setNewCustomerPhone] = useState('')
  const [newCustomerId, setNewCustomerId] = useState('')
  const [showNewCustomer, setShowNewCustomer] = useState(false)
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false)

  const handleSearchChange = useCallback(async (value: string) => {
    setCustomerSearch(value)
    if (value.trim().length < 2) { setCustomerResults([]); return }
    const results = await searchCustomers(value.trim())
    setCustomerResults(results)
  }, [])

  const handleCreateCustomer = useCallback(async (): Promise<boolean> => {
    if (!newCustomerName.trim()) return false
    setIsCreatingCustomer(true)
    try {
      const customer = await createCustomer({
        name: newCustomerName.trim(),
        phone: newCustomerPhone.trim() || undefined,
        idNumber: newCustomerId.trim() || undefined,
      })
      setSelectedCustomer(customer)
      setShowNewCustomer(false)
      setNewCustomerName('')
      setNewCustomerPhone('')
      setNewCustomerId('')
      setCustomerResults([])
      setCustomerSearch('')
      return true
    } finally {
      setIsCreatingCustomer(false)
    }
  }, [newCustomerName, newCustomerPhone, newCustomerId])

  const handleClearCustomer = useCallback(() => {
    setSelectedCustomer(null)
    setCustomerSearch('')
    setCustomerResults([])
  }, [])

  return {
    customerSearch, setCustomerSearch: handleSearchChange,
    customerResults, selectedCustomer, setSelectedCustomer,
    newCustomerName, setNewCustomerName,
    newCustomerPhone, setNewCustomerPhone,
    newCustomerId, setNewCustomerId,
    showNewCustomer, setShowNewCustomer,
    isCreatingCustomer, handleCreateCustomer,
    handleClearCustomer,
  }
}
