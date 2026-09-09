// useDebts — debt list state and actions for DebtScreen
import { useState, useCallback } from 'react'
import type { Debt } from '../lib/types'
import { getAllDebts, getDebtById } from '../services/db-debts'

export function useDebts() {
  const [debts, setDebts] = useState<Debt[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const loadDebts = useCallback(async () => {
    setIsLoading(true)
    try {
      setDebts(await getAllDebts())
    } finally {
      setIsLoading(false)
    }
  }, [])

  async function loadDebtById(id: string): Promise<Debt | null> {
    return getDebtById(id)
  }

  return { debts, isLoading, loadDebts, loadDebtById }
}
