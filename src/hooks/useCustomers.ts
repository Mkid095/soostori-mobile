// useCustomers — customer list state for DebtScreen
import { useState, useCallback } from 'react'
import type { Customer } from '../lib/types'
import { getAllCustomers } from '../services/db-customers'

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const loadCustomers = useCallback(async () => {
    setIsLoading(true)
    try {
      setCustomers(await getAllCustomers())
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { customers, isLoading, loadCustomers }
}
