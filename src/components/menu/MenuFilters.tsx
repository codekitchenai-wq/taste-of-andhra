import { ChevronDown, SlidersHorizontal } from 'lucide-react'
import { Chip } from '@/components/ui/Chip'
import { Select } from '@/components/ui/Select'
import { SPICE_LEVEL, SPICE_LEVEL_LIST } from '@/constants/SPICE_LEVEL'
import type { MenuFilterState, SortFilter } from '@/hooks/useMenuDishes'
import type { Category } from '@/types/Category'
import type { SpiceLevel } from '@/types/enums'
import { cn } from '@/utils/cn'

interface MenuFiltersProps {
  filters: MenuFilterState
  categories: Category[]
  isOpen: boolean
  onToggle: () => void
  onChange: (updates: Partial<MenuFilterState>) => void
  onClear: () => void
}

const sortOptions: { label: string; value: SortFilter }[] = [
  { label: 'Newest', value: 'default' },
  { label: 'Price: Low to High', value: 'price' },
  { label: 'Rating: High to Low', value: 'rating' },
]

export function MenuFilters({
  filters,
  categories,
  isOpen,
  onToggle,
  onChange,
  onClear,
}: MenuFiltersProps) {
  const hasActiveFilters =
    filters.categoryId !== null ||
    filters.diet !== 'all' ||
    filters.spiceLevel !== null ||
    filters.sortBy !== 'default'

  return (
    <section aria-label="Menu filters" className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onToggle}
          className="inline-flex items-center gap-2 rounded-[var(--radius-button)] border border-gray-200 bg-surface px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:border-primary/30 hover:text-primary md:hidden"
          aria-expanded={isOpen}
          aria-controls="menu-filters-panel"
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          Filters
          <ChevronDown
            className={cn(
              'h-4 w-4 transition-transform',
              isOpen && 'rotate-180',
            )}
            aria-hidden="true"
          />
        </button>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClear}
            className="text-sm font-medium text-primary transition-colors hover:opacity-80"
          >
            Clear filters
          </button>
        )}
      </div>

      <div
        id="menu-filters-panel"
        className={cn(
          'space-y-5 rounded-[var(--radius-card)] bg-surface p-4 shadow-sm md:block md:p-5',
          !isOpen && 'hidden md:block',
        )}
      >
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-text-primary">Category</h3>
          <div className="flex flex-wrap gap-2">
            <Chip
              label="All"
              active={filters.categoryId === null}
              onClick={() => onChange({ categoryId: null })}
            />
            {categories.map((category) => (
              <Chip
                key={category.id}
                label={category.name}
                active={filters.categoryId === category.id}
                onClick={() => onChange({ categoryId: category.id })}
              />
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-text-primary">Diet</h3>
          <div className="flex flex-wrap gap-2">
            <Chip
              label="All"
              active={filters.diet === 'all'}
              onClick={() => onChange({ diet: 'all' })}
            />
            <Chip
              label="Veg"
              active={filters.diet === 'veg'}
              onClick={() => onChange({ diet: 'veg' })}
            />
            <Chip
              label="Non-Veg"
              active={filters.diet === 'non-veg'}
              onClick={() => onChange({ diet: 'non-veg' })}
            />
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-text-primary">
              Spice Level
            </h3>
            <div className="flex flex-wrap gap-2">
              <Chip
                label="All"
                active={filters.spiceLevel === null}
                onClick={() => onChange({ spiceLevel: null })}
              />
              {SPICE_LEVEL_LIST.map((level) => (
                <Chip
                  key={level}
                  label={SPICE_LEVEL[level]}
                  active={filters.spiceLevel === level}
                  onClick={() => onChange({ spiceLevel: level as SpiceLevel })}
                />
              ))}
            </div>
          </div>

          <Select
            label="Sort By"
            options={sortOptions}
            value={filters.sortBy}
            onChange={(event) =>
              onChange({ sortBy: event.target.value as SortFilter })
            }
          />
        </div>
      </div>
    </section>
  )
}
