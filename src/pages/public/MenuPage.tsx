import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Zap } from 'lucide-react'
import { WhatsAppLink } from '@/components/ui/WhatsAppLink'
import { useStorefrontWhatsApp } from '@/hooks/useStorefrontWhatsApp'
import { MenuDishCard } from '@/components/menu/MenuDishCard'
import { MenuFilters } from '@/components/menu/MenuFilters'
import { MenuGoToCartBar } from '@/components/menu/MenuGoToCartBar'
import { Container } from '@/components/ui/Container'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { LoadingState } from '@/components/ui/LoadingState'
import { ROUTES } from '@/constants/ROUTES'
import {
  DEFAULT_MENU_FILTERS,
  useMenuDishes,
} from '@/hooks/useMenuDishes'
import { usePublicCategories } from '@/hooks/usePublicCategories'
import { useMenuImageFallbacks } from '@/hooks/useMenuImageFallbacks'

export default function MenuPage() {
  const { enabled: showWhatsApp, orderUrl: whatsAppHref } = useStorefrontWhatsApp()
  const [filters, setFilters] = useState(DEFAULT_MENU_FILTERS)
  const { categories } = usePublicCategories()
  const { dishes, isLoading, error, refetch } = useMenuDishes(filters)
  const categoryImages = useMenuImageFallbacks(categories, dishes)

  const categoryNames = useMemo(
    () => Object.fromEntries(categories.map((category) => [category.id, category.name])),
    [categories],
  )

  const updateFilters = (updates: Partial<typeof filters>) => {
    setFilters((current) => ({ ...current, ...updates }))
  }

  const clearFilters = () => {
    setFilters(DEFAULT_MENU_FILTERS)
  }

  const hasActiveQuery =
    filters.search.trim().length > 0 ||
    filters.categoryId !== null ||
    filters.diet !== 'all' ||
    filters.spiceLevel !== null ||
    filters.sortBy !== 'default'

  return (
    <Container as="div" className="pb-24 py-3 md:pb-28 md:py-4">
      <header className="mb-2 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-baseline gap-2">
          <h1 className="font-heading text-xl font-bold md:text-2xl">Our Menu</h1>
          {!isLoading && !error && dishes.length > 0 ? (
            <span className="text-xs text-text-secondary">
              {dishes.length} {dishes.length === 1 ? 'dish' : 'dishes'}
            </span>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {showWhatsApp && whatsAppHref ? (
            <WhatsAppLink href={whatsAppHref} variant="inline" className="hidden sm:inline-flex">
              WhatsApp order
            </WhatsAppLink>
          ) : null}
          <Link
            to={ROUTES.LIGHT_MENU}
            className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary-dark"
          >
            <Zap className="h-3.5 w-3.5" aria-hidden="true" />
            Light menu
          </Link>
        </div>
      </header>

      <div className="sticky top-[72px] z-40 -mx-4 mb-3 border-b border-black/5 bg-background/95 px-4 py-2 backdrop-blur md:static md:mx-0 md:mb-3 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <MenuFilters
          filters={filters}
          categories={categories}
          onChange={updateFilters}
          onClear={clearFilters}
        />
      </div>

      <div>
        {isLoading && <LoadingState variant="grid" />}

        {!isLoading && error && (
          <ErrorState message={error} onRetry={() => void refetch()} />
        )}

        {!isLoading && !error && dishes.length === 0 && (
          <EmptyState
            title={hasActiveQuery ? 'No dishes found' : 'Menu coming soon'}
            description={
              hasActiveQuery
                ? 'Try adjusting your search or filters to find something else.'
                : 'We are preparing our menu. Please check back soon.'
            }
            actionLabel={hasActiveQuery ? 'Clear filters' : undefined}
            onAction={hasActiveQuery ? clearFilters : undefined}
          />
        )}

        {!isLoading && !error && dishes.length > 0 && (
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
        )}
      </div>

      <MenuGoToCartBar />
    </Container>
  )
}
