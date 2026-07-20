import { useCallback, useEffect, useState } from 'react'
import * as reportService from '@/services/reportService'
import type { DashboardOverview } from '@/services/reportService'

export function useAdminDashboard() {
  const [overview, setOverview] = useState<DashboardOverview | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    const result = await reportService.getDashboardOverview()

    if (result.success) {
      setOverview(result.data)
    } else {
      setError(result.message)
      setOverview(null)
    }

    setIsLoading(false)
  }, [])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { overview, isLoading, error, refetch }
}
