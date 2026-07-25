import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import { MenuDishCard } from '@/components/menu/MenuDishCard'
import { Container } from '@/components/ui/Container'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { LoadingState } from '@/components/ui/LoadingState'
import { PageHeader } from '@/components/ui/PageHeader'
import { usePublicCategories } from '@/hooks/usePublicCategories'
import * as branchService from '@/services/branchService'
import * as dishService from '@/services/dishService'
import type { Branch } from '@/types/Branch'
import type { Dish } from '@/types/Dish'
import { formatBranchAddress } from '@/utils/mapBranch'

export default function BranchMenuPage() {
  const { slug } = useParams<{ slug: string }>()
  const { categories } = usePublicCategories()
  const [branch, setBranch] = useState<Branch | null>(null)
  const [dishes, setDishes] = useState<Dish[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const categoryNames = useMemo(
    () =>
      Object.fromEntries(categories.map((category) => [category.id, category.name])),
    [categories],
  )

  const refetch = useCallback(async () => {
    if (!slug) {
      setError('Branch not found.')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    const branchResult = await branchService.getBranchBySlug(slug)

    if (!branchResult.success) {
      setError(branchResult.message)
      setBranch(null)
      setDishes([])
      setIsLoading(false)
      return
    }

    setBranch(branchResult.data)

    const dishesResult = await dishService.getDishes()

    if (dishesResult.success) {
      setDishes(dishesResult.data)
    } else {
      setError(dishesResult.message)
      setDishes([])
    }

    setIsLoading(false)
  }, [slug])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return (
    <Container as="div" className="py-8 md:py-12">
      {branch && (
        <>
          <PageHeader
            title={branch.name}
            description="Order from this branch — browse our full menu below."
          />
          <div className="mb-8 flex flex-col gap-2 rounded-[var(--radius-card)] bg-surface p-5 shadow-md sm:flex-row sm:items-start sm:gap-4">
            <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div className="text-sm text-text-secondary">
              <p>{formatBranchAddress(branch)}</p>
              {branch.phone && <p className="mt-1">{branch.phone}</p>}
              {branch.opening_hours && (
                <p className="mt-1">Hours: {branch.opening_hours}</p>
              )}
            </div>
          </div>
        </>
      )}

      {isLoading && <LoadingState variant="grid" />}

      {!isLoading && error && (
        <ErrorState message={error} onRetry={() => void refetch()} />
      )}

      {!isLoading && !error && dishes.length === 0 && (
        <EmptyState
          title="Menu coming soon"
          description="We are preparing our menu. Please check back soon."
        />
      )}

      {!isLoading && !error && dishes.length > 0 && (
        <>
          <p className="mb-6 text-sm text-text-secondary">
            {dishes.length} {dishes.length === 1 ? 'dish' : 'dishes'} available
          </p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {dishes.map((dish) => (
              <MenuDishCard
                key={dish.id}
                dish={dish}
                categoryName={categoryNames[dish.category_id]}
              />
            ))}
          </div>
        </>
      )}
    </Container>
  )
}
