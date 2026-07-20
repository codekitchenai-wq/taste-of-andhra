import { useCallback, useEffect, useState } from 'react'
import * as customerService from '@/services/customerService'
import type { CustomerSearchParams } from '@/services/customerService'
import type { Profile } from '@/types/Profile'

export function useAdminCustomers(search?: string) {
  const [customers, setCustomers] = useState<Profile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [debouncedSearch, setDebouncedSearch] = useState(search ?? '')

  useEffect(() => {
    const timer = window.setTimeout(
      () => setDebouncedSearch(search ?? ''),
      300,
    )

    return () => window.clearTimeout(timer)
  }, [search])

  const refetch = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    const params: CustomerSearchParams = {}

    if (debouncedSearch.trim()) {
      params.search = debouncedSearch.trim()
    }

    const result = await customerService.getCustomers(params)

    if (result.success) {
      setCustomers(result.data)
    } else {
      setError(result.message)
      setCustomers([])
    }

    setIsLoading(false)
  }, [debouncedSearch])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { customers, isLoading, error, refetch }
}
