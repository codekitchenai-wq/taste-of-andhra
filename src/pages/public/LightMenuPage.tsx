import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ImageIcon } from 'lucide-react'
import { LightMenuRow } from '@/components/menu/LightMenuRow'
import { MenuGoToCartBar } from '@/components/menu/MenuGoToCartBar'
import { MenuSearchBar } from '@/components/menu/MenuSearchBar'
import { Container } from '@/components/ui/Container'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { LoadingState } from '@/components/ui/LoadingState'
import { ROUTES } from '@/constants/ROUTES'
import {
  DEFAULT_MENU_FILTERS,
  useMenuDishes,
  type DietFilter,
  type MenuFilterState,
} from '@/hooks/useMenuDishes'
import { usePublicCategories } from '@/hooks/usePublicCategories'
import { cn } from '@/utils/cn'

const DIET_OPTIONS: { value: DietFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'veg', label: 'Veg' },
  { value: 'non-veg', label: 'Non-Veg' },
]

export default function LightMenuPage() {
  const [filters, setFilters] = useState<MenuFilterState>(DEFAULT_MENU_FILTERS)
  const { categories } = usePublicCategories()
  const { dishes, isLoading, error, refetch } = useMenuDishes(filters)

  const groupedDishes = useMemo(() => {
    const categoryOrder = new Map(
      categories.map((category, index) => [category.id, index]),
    )
    const categoryNames = Object.fromEntries(
      categories.map((category) => [category.id, category.name]),
    )

    const groups = new Map<string, typeof dishes>()

    for (const dish of dishes) {
      const key = dish.category_id
      const existing = groups.get(key)

      if (existing) {
        existing.push(dish)
      } else {
        groups.set(key, [dish])
      }
    }

    return [...groups.entries()]
      .sort(
        ([a], [b]) =>
          (categoryOrder.get(a) ?? Number.MAX_SAFE_INTEGER) -
          (categoryOrder.get(b) ?? Number.MAX_SAFE_INTEGER),
      )
      .map(([categoryId, items]) => ({
        categoryId,
        categoryName: categoryNames[categoryId] ?? 'Other',
        items,
      }))
  }, [categories, dishes])

  const hasActiveQuery =
    filters.search.trim().length > 0 || filters.diet !== 'all'

  const clearFilters = () => {
    setFilters({ ...DEFAULT_MENU_FILTERS })
  }

  return (
    <Container as="div" className="pb-28 pt-6 md:pb-32 md:pt-10">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-primary">
            Fast order
          </p>
          <h1 className="mt-1 font-heading text-2xl font-bold text-text-primary md:text-3xl">
            Light Menu
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Text-only list — no photos, quicker to browse and order.
          </p>
        </div>
        <Link
          to={ROUTES.MENU}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary-dark"
        >
          <ImageIcon className="h-4 w-4" aria-hidden="true" />
          Full menu with photos
        </Link>
      </div>

      <div className="sticky top-[72px] z-40 -mx-4 mb-4 border-b border-black/5 bg-background/95 px-4 py-3 backdrop-blur md:static md:mx-0 md:mb-6 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <MenuSearchBar
          value={filters.search}
          onChange={(search) => setFilters((current) => ({ ...current, search }))}
        />

        <div
          className="mt-3 flex gap-2"
          role="group"
          aria-label="Diet filter"
        >
          {DIET_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() =>
                setFilters((current) => ({ ...current, diet: option.value }))
              }
              className={cn(
                'rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
                filters.diet === option.value
                  ? 'bg-primary text-white'
                  : 'bg-surface text-text-secondary shadow-sm hover:text-text-primary',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <LoadingState variant="inline" />}

      {!isLoading && error && (
        <ErrorState message={error} onRetry={() => void refetch()} />
      )}

      {!isLoading && !error && dishes.length === 0 && (
        <EmptyState
          title={hasActiveQuery ? 'No dishes found' : 'Menu coming soon'}
          description={
            hasActiveQuery
              ? 'Try a different search or diet filter.'
              : 'We are preparing our menu. Please check back soon.'
          }
          actionLabel={hasActiveQuery ? 'Clear filters' : undefined}
          onAction={hasActiveQuery ? clearFilters : undefined}
        />
      )}

      {!isLoading && !error && groupedDishes.length > 0 && (
        <div className="space-y-8">
          {groupedDishes.map((group) => (
            <section key={group.categoryId} aria-labelledby={`cat-${group.categoryId}`}>
              <h2
                id={`cat-${group.categoryId}`}
                className="mb-2 border-b border-primary/15 pb-2 font-heading text-lg font-semibold text-text-primary"
              >
                {group.categoryName}
              </h2>
              <div className="rounded-[var(--radius-card)] bg-surface px-4 shadow-sm">
                {group.items.map((dish) => (
                  <LightMenuRow key={dish.id} dish={dish} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <MenuGoToCartBar />
    </Container>
  )
}
