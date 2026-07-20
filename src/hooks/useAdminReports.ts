import { useCallback, useEffect, useState } from 'react'
import * as reportService from '@/services/reportService'
import type { ReportsOverview } from '@/services/reportService'

export function useAdminReports() {
  const [reports, setReports] = useState<ReportsOverview | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    const result = await reportService.getReportsOverview()

    if (result.success) {
      setReports(result.data)
    } else {
      setError(result.message)
      setReports(null)
    }

    setIsLoading(false)
  }, [])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return {
    reports,
    isLoading,
    error,
    refetch,
  }
}
