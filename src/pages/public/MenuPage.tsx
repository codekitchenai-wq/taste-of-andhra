import { useMemo, useState } from 'react'
import { MenuDishCard } from '@/components/menu/MenuDishCard'
import { MenuFilters } from '@/components/menu/MenuFilters'
import { MenuSearchBar } from '@/components/menu/MenuSearchBar'
import { Container } from '@/components/ui/Container'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { LoadingState } from '@/components/ui/LoadingState'
import { PageHeader } from '@/components/ui/PageHeader'
import {
  DEFAULT_MENU_FILTERS,
  useMenuDishes,
} from '@/hooks/useMenuDishes'
import { usePublicCategories } from '@/hooks/usePublicCategories'

export default function MenuPage() {
  const [filters, setFilters] = useState(DEFAULT_MENU_FILTERS)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const { categories } = usePublicCategories()
  const { dishes, isLoading, error, refetch } = useMenuDishes(filters)

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
    <Container as="div" className="py-8 md:py-12">
      <PageHeader
        title="Our Menu"
        description="Explore authentic Andhra dishes — filter by category, diet, spice level, and more."
      />

      <div className="sticky top-[72px] z-40 -mx-4 mb-6 border-b border-black/5 bg-background/95 px-4 py-4 backdrop-blur md:static md:mx-0 md:mb-8 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <MenuSearchBar
          value={filters.search}
          onChange={(search) => updateFilters({ search })}
        />
      </div>

      <MenuFilters
        filters={filters}
        categories={categories}
        isOpen={filtersOpen}
        onToggle={() => setFiltersOpen((open) => !open)}
        onChange={updateFilters}
        onClear={clearFilters}
      />

      <div className="mt-8">
        {!isLoading && !error && dishes.length > 0 && (
          <p className="mb-6 text-sm text-text-secondary">
            {dishes.length} {dishes.length === 1 ? 'dish' : 'dishes'} found
          </p>
        )}

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
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {dishes.map((dish) => (
              <MenuDishCard
                key={dish.id}
                dish={dish}
                categoryName={categoryNames[dish.category_id]}
              />
            ))}
          </div>
        )}
      </div>
    </Container>
  )
}
