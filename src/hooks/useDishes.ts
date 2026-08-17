import { useCallback, useEffect, useState } from 'react'
import { useOrganization } from '@/contexts/OrganizationContext'
import * as dishService from '@/services/dishService'
import type { DishWithCategory } from '@/utils/mapDish'

export function useDishes() {
  const { organizationId, isLoading: orgLoading } = useOrganization()
  const [dishes, setDishes] = useState<DishWithCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    if (orgLoading) return
    setIsLoading(true)
    setError(null)

    const result = await dishService.getAllDishes()

    if (result.success) {
      setDishes(result.data)
    } else {
      setError(result.message)
      setDishes([])
    }

    setIsLoading(false)
  }, [organizationId, orgLoading])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return {
    dishes,
    isLoading,
    error,
    refetch,
  }
}
