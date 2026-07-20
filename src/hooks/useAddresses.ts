import { useCallback, useEffect, useState } from 'react'
import * as addressService from '@/services/addressService'
import type { Address } from '@/types/Address'

export function useAddresses() {
  const [addresses, setAddresses] = useState<Address[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    const result = await addressService.getAddresses()

    if (result.success) {
      setAddresses(result.data)
    } else {
      setError(result.message)
      setAddresses([])
    }

    setIsLoading(false)
  }, [])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return {
    addresses,
    isLoading,
    error,
    refetch,
  }
}
