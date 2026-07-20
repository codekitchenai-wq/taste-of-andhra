import { useCallback, useEffect, useState } from 'react'
import type { ServiceResponse } from '@/types/api'

interface UseQueryResult<T> {
  data: T | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useQuery<T>(
  fetcher: () => Promise<ServiceResponse<T>>,
  deps: unknown[] = [],
): UseQueryResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    const result = await fetcher()

    if (result.success) {
      setData(result.data)
    } else {
      setError(result.message)
      setData(null)
    }

    setIsLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { data, isLoading, error, refetch }
}
