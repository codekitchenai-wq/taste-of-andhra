import { useCallback, useEffect, useState } from 'react'
import { useOrganization } from '@/contexts/OrganizationContext'
import * as categoryService from '@/services/categoryService'
import type { Category } from '@/types/Category'

export function usePublicCategories() {
  const { organizationId, isLoading: orgLoading } = useOrganization()
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    if (orgLoading) return
    setIsLoading(true)
    setError(null)

    const result = await categoryService.getCategories()

    if (result.success) {
      setCategories(result.data)
    } else {
      setError(result.message)
      setCategories([])
    }

    setIsLoading(false)
  }, [organizationId, orgLoading])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return {
    categories,
    isLoading,
    error,
    refetch,
  }
}
