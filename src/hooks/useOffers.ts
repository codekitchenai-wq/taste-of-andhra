import { useCallback, useEffect, useState } from 'react'
import * as offerService from '@/services/offerService'
import type { Offer } from '@/types/Offer'

export function useOffers() {
  const [offers, setOffers] = useState<Offer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    const result = await offerService.getAllOffers()

    if (result.success) {
      setOffers(result.data)
    } else {
      setError(result.message)
      setOffers([])
    }

    setIsLoading(false)
  }, [])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { offers, isLoading, error, refetch }
}
