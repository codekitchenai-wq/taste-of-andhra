import { useCallback, useEffect, useState } from 'react'
import { useOrganization } from '@/contexts/OrganizationContext'
import * as dishService from '@/services/dishService'
import * as categoryService from '@/services/categoryService'
import type { Dish } from '@/types/Dish'
import type { Category } from '@/types/Category'

export function useDishBySlug(slug: string | undefined) {
  const { organizationId, isLoading: orgLoading } = useOrganization()
  const [dish, setDish] = useState<Dish | null>(null)
  const [category, setCategory] = useState<Category | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    if (orgLoading) return
    if (!slug) {
      setDish(null)
      setCategory(null)
      setIsLoading(false)
      setError('Dish not found.')
      return
    }

    setIsLoading(true)
    setError(null)

    const dishResult = await dishService.getDishBySlug(slug)

    if (!dishResult.success) {
      setError(dishResult.message)
      setDish(null)
      setCategory(null)
      setIsLoading(false)
      return
    }

    setDish(dishResult.data)

    const categoryResult = await categoryService.getCategoryById(
      dishResult.data.category_id,
    )

    if (categoryResult.success) {
      setCategory(categoryResult.data)
    } else {
      setCategory(null)
    }

    setIsLoading(false)
  }, [slug, organizationId, orgLoading])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { dish, category, isLoading, error, refetch }
}
