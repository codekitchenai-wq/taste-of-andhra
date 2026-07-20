import { useCallback, useEffect, useState } from 'react'
import * as dishService from '@/services/dishService'
import type { DishWithCategory } from '@/utils/mapDish'

export function useDishes() {
  const [dishes, setDishes] = useState<DishWithCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
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
  }, [])

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
