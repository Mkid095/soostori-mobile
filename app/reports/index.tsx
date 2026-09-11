// app/reports/index.tsx — Phase 13: redirect to sales report
import { useEffect } from 'react'
import { useRouter } from 'expo-router'

export default function ReportsIndex() {
  const router = useRouter()
  useEffect(() => { router.replace('/reports/sales' as any) }, [])
  return null
}
