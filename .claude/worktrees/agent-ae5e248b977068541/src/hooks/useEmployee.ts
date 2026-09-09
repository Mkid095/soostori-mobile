// useEmployee — current authenticated employee session
import { useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getEmployeeByPin, getEmployeeById } from '../services/db-employees'
import { getDefaultShop } from '../services/db-shops'
import type { Employee } from '../lib/sync-protocol'

const EMPLOYEE_KEY = '@soostori:employeeId'
const SHOP_KEY = '@soostori:shopId'

export function useEmployee() {
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [shopId, setShopId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadStoredEmployee()
  }, [])

  async function loadStoredEmployee() {
    try {
      const [empId, sId] = await Promise.all([
        AsyncStorage.getItem(EMPLOYEE_KEY),
        AsyncStorage.getItem(SHOP_KEY),
      ])
      if (empId && sId) {
        const emp = await getEmployeeById(empId)
        if (emp) { setEmployee(emp); setShopId(sId) }
      } else if (sId) {
        setShopId(sId)
      } else {
        const shop = await getDefaultShop()
        setShopId(shop.id)
      }
    } finally {
      setIsLoading(false)
    }
  }

  async function loginWithPin(pin: string): Promise<boolean> {
    setIsLoading(true)
    try {
      if (!shopId) {
        const shop = await getDefaultShop()
        setShopId(shop.id)
      }
      const emp = await getEmployeeByPin(shopId || 'shop-default', pin)
      if (emp) {
        await AsyncStorage.setItem(EMPLOYEE_KEY, emp.id)
        await AsyncStorage.setItem(SHOP_KEY, emp.shopId)
        setEmployee(emp)
        return true
      }
      return false
    } finally {
      setIsLoading(false)
    }
  }

  async function logout(): Promise<void> {
    await AsyncStorage.removeItem(EMPLOYEE_KEY)
    setEmployee(null)
  }

  return { employee, shopId, isLoading, loginWithPin, logout }
}
