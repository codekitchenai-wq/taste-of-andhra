import { useQuery } from '@/hooks/useQuery'
import * as categoryService from '@/services/categoryService'

export function useCategories() {
  const { data, isLoading, error, refetch } = useQuery(() =>
    categoryService.getAllCategories(),
  )

  return {
    categories: data ?? [],
    isLoading,
    error,
    refetch,
  }
}
