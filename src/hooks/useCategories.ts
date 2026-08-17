import { useQuery } from '@/hooks/useQuery'
import { useOrganization } from '@/contexts/OrganizationContext'
import * as categoryService from '@/services/categoryService'

export function useCategories() {
  const { organizationId, isLoading: orgLoading } = useOrganization()
  const { data, isLoading, error, refetch } = useQuery(
    () => categoryService.getAllCategories(),
    [organizationId],
    { enabled: !orgLoading },
  )

  return {
    categories: data ?? [],
    isLoading,
    error,
    refetch,
  }
}
