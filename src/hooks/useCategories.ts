import { useCallback, useEffect, useState } from 'react'
import * as categoryService from '@/services/categoryService'
import type { Category } from '@/types/Category'

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    const result = await categoryService.getAllCategories()

    if (result.success) {
      setCategories(result.data)
    } else {
      setError(result.message)
      setCategories([])
    }

    setIsLoading(false)
  }, [])

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
