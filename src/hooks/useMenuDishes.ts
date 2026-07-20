import { useCallback, useEffect, useMemo, useState } from 'react'
import * as dishService from '@/services/dishService'
import type { DishFilters } from '@/services/dishService'
import type { Dish } from '@/types/Dish'
import type { SpiceLevel } from '@/types/enums'

export type DietFilter = 'all' | 'veg' | 'non-veg'
export type SortFilter = 'default' | 'price' | 'rating'

export interface MenuFilterState {
  search: string
  categoryId: string | null
  diet: DietFilter
  spiceLevel: SpiceLevel | null
  sortBy: SortFilter
}

export const DEFAULT_MENU_FILTERS: MenuFilterState = {
  search: '',
  categoryId: null,
  diet: 'all',
  spiceLevel: null,
  sortBy: 'default',
}

function toDishFilters(
  filters: MenuFilterState,
  debouncedSearch: string,
): DishFilters {
  return {
    search: debouncedSearch.trim() || undefined,
    categoryId: filters.categoryId ?? undefined,
    isVeg:
      filters.diet === 'veg'
        ? true
        : filters.diet === 'non-veg'
          ? false
          : undefined,
    spiceLevel: filters.spiceLevel ?? undefined,
    sortBy: filters.sortBy === 'default' ? undefined : filters.sortBy,
  }
}

export function useMenuDishes(filters: MenuFilterState) {
  const [dishes, setDishes] = useState<Dish[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search)

  useEffect(() => {
    const timer = window.setTimeout(
      () => setDebouncedSearch(filters.search),
      300,
    )

    return () => window.clearTimeout(timer)
  }, [filters.search])

  const dishFilters = useMemo(
    () => toDishFilters(filters, debouncedSearch),
    [filters, debouncedSearch],
  )

  const refetch = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    const result = await dishService.getDishes(dishFilters)

    if (result.success) {
      setDishes(result.data)
    } else {
      setError(result.message)
      setDishes([])
    }

    setIsLoading(false)
  }, [dishFilters])

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
