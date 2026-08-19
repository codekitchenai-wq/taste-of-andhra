import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { QrCode } from 'lucide-react'
import { MenuDishCard } from '@/components/menu/MenuDishCard'
import { MenuGoToCartBar } from '@/components/menu/MenuGoToCartBar'
import { Container } from '@/components/ui/Container'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { LoadingState } from '@/components/ui/LoadingState'
import { PageHeader } from '@/components/ui/PageHeader'
import { usePublicCategories } from '@/hooks/usePublicCategories'
import { useMenuImageFallbacks } from '@/hooks/useMenuImageFallbacks'
import { useOrganization } from '@/contexts/OrganizationContext'
import * as dishService from '@/services/dishService'
import * as qrTableService from '@/services/qrTableService'
import type { QrTableWithBranch } from '@/services/qrTableService'
import type { Dish } from '@/types/Dish'

export default function QrMenuPage() {
  const { tableCode } = useParams<{ tableCode: string }>()
  const { organizationId, isLoading: orgLoading } = useOrganization()
  const { categories } = usePublicCategories()
  const [qrTable, setQrTable] = useState<QrTableWithBranch | null>(null)
  const [dishes, setDishes] = useState<Dish[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const categoryImages = useMenuImageFallbacks(categories, dishes)

  const categoryNames = useMemo(
    () =>
      Object.fromEntries(categories.map((category) => [category.id, category.name])),
    [categories],
  )

  const refetch = useCallback(async () => {
    if (orgLoading) return
    if (!tableCode) {
      setError('Invalid table code.')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    const tableResult = await qrTableService.getQrTableByCode(tableCode)

    if (!tableResult.success) {
      setError(tableResult.message)
      setQrTable(null)
      setDishes([])
      setIsLoading(false)
      return
    }

    setQrTable(tableResult.data)

    const dishesResult = await dishService.getDishes()

    if (dishesResult.success) {
      setDishes(dishesResult.data)
    } else {
      setError(dishesResult.message)
      setDishes([])
    }

    setIsLoading(false)
  }, [tableCode, organizationId, orgLoading])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return (
    <Container as="div" className="pb-24 py-8 md:pb-28 md:py-12">
      {qrTable && (
        <PageHeader
          title={qrTable.branch.name}
          description={`Table ${qrTable.label} · Scan-to-order menu`}
        />
      )}

      {!qrTable && !isLoading && !error && (
        <PageHeader
          title="QR Menu"
          description="Browse our menu from your table."
        />
      )}

      {isLoading && <LoadingState variant="grid" />}

      {!isLoading && error && (
        <ErrorState message={error} onRetry={() => void refetch()} />
      )}

      {!isLoading && !error && dishes.length === 0 && (
        <EmptyState
          title="Menu coming soon"
          description="We are preparing our menu. Please check back soon."
          icon={QrCode}
        />
      )}

      {!isLoading && !error && dishes.length > 0 && (
        <>
          <p className="mb-6 text-sm text-text-secondary">
            {dishes.length} {dishes.length === 1 ? 'dish' : 'dishes'} available
          </p>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {dishes.map((dish) => (
              <MenuDishCard
                key={dish.id}
                dish={dish}
                categoryName={categoryNames[dish.category_id]}
                fallbackImage={categoryImages.get(dish.category_id)}
              />
            ))}
          </div>
        </>
      )}

      <MenuGoToCartBar />
    </Container>
  )
}
