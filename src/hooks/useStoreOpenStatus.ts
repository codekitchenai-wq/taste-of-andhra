import { useEffect, useState } from 'react'
import * as settingsService from '@/services/settingsService'
import type { StoreOpenStatus } from '@/types/StoreHours'
import { getStoreOpenStatus } from '@/utils/storeHours'

interface UseStoreOpenStatusResult {
  status: StoreOpenStatus | null
  isLoading: boolean
  refresh: () => void
}

export function useStoreOpenStatus(): UseStoreOpenStatusResult {
  const [status, setStatus] = useState<StoreOpenStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setIsLoading(true)
      const result = await settingsService.getStoreOperatingHours()
      if (cancelled) return

      if (result.success) {
        setStatus(getStoreOpenStatus(result.data))
      } else {
        setStatus(null)
      }
      setIsLoading(false)
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [tick])

  return {
    status,
    isLoading,
    refresh: () => setTick((value) => value + 1),
  }
}
