import { useCallback, useEffect, useState } from 'react'
import { useOrganization } from '@/contexts/OrganizationContext'
import * as addressService from '@/services/addressService'
import type { Address } from '@/types/Address'

export function useAddresses() {
  const { organizationId, isLoading: orgLoading } = useOrganization()
  const [addresses, setAddresses] = useState<Address[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    if (orgLoading) return
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
  }, [organizationId, orgLoading])

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
