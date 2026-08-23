import { useCallback, useEffect, useState } from 'react'
import { useOrganization } from '@/contexts/OrganizationContext'
import { useAuth } from '@/hooks/useAuth'
import * as addressService from '@/services/addressService'
import type { Address } from '@/types/Address'

export function useAddresses() {
  const { organizationId, isLoading: orgLoading } = useOrganization()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const [addresses, setAddresses] = useState<Address[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    if (orgLoading || authLoading) return

    if (!isAuthenticated) {
      setAddresses([])
      setError(null)
      setIsLoading(false)
      return
    }

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
  }, [organizationId, orgLoading, authLoading, isAuthenticated])

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
