import { Search, X } from 'lucide-react'
import { SPICE_LEVEL, SPICE_LEVEL_LIST } from '@/constants/SPICE_LEVEL'
import type { MenuFilterState, SortFilter } from '@/hooks/useMenuDishes'
import type { Category } from '@/types/Category'
import type { SpiceLevel } from '@/types/enums'
import { cn } from '@/utils/cn'

interface MenuFiltersProps {
  filters: MenuFilterState
  categories: Category[]
  onChange: (updates: Partial<MenuFilterState>) => void
  onClear: () => void
}

const sortOptions: { label: string; value: SortFilter }[] = [
  { label: 'Newest', value: 'default' },
  { label: 'Price: Low → High', value: 'price' },
  { label: 'Rating', value: 'rating' },
]

const selectClass =
  'h-9 min-w-0 rounded-[var(--radius-input)] border border-gray-300 bg-surface px-2 text-xs text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20'

export function MenuFilters({
  filters,
  categories,
  onChange,
  onClear,
}: MenuFiltersProps) {
  const hasActiveFilters =
    filters.search.trim().length > 0 ||
    filters.categoryId !== null ||
    filters.diet !== 'all' ||
    filters.spiceLevel !== null ||
    filters.sortBy !== 'default'

  return (
    <section
      aria-label="Menu search and filters"
      className="flex flex-wrap items-center gap-2 rounded-[var(--radius-card)] border border-black/5 bg-surface p-2"
    >
      <div className="relative min-w-[10rem] flex-1 basis-40">
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-secondary"
          aria-hidden="true"
        />
        <input
          type="search"
          placeholder="Search…"
          value={filters.search}
          onChange={(event) => onChange({ search: event.target.value })}
          className={cn(selectClass, 'w-full pl-8 pr-8')}
          aria-label="Search dishes"
        />
        {filters.search ? (
          <button
            type="button"
            onClick={() => onChange({ search: '' })}
            className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-text-secondary hover:bg-black/5"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      <label className="sr-only" htmlFor="menu-filter-category">
        Category
      </label>
      <select
        id="menu-filter-category"
        className={cn(selectClass, 'w-[8.5rem] sm:w-40')}
        value={filters.categoryId ?? ''}
        onChange={(event) =>
          onChange({
            categoryId: event.target.value ? event.target.value : null,
          })
        }
      >
        <option value="">All categories</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>

      <label className="sr-only" htmlFor="menu-filter-diet">
        Diet
      </label>
      <select
        id="menu-filter-diet"
        className={cn(selectClass, 'w-[6.5rem]')}
        value={filters.diet}
        onChange={(event) =>
          onChange({
            diet: event.target.value as MenuFilterState['diet'],
          })
        }
      >
        <option value="all">All diet</option>
        <option value="veg">Veg</option>
        <option value="non-veg">Non-Veg</option>
      </select>

      <label className="sr-only" htmlFor="menu-filter-spice">
        Spice
      </label>
      <select
        id="menu-filter-spice"
        className={cn(selectClass, 'w-[6.75rem]')}
        value={filters.spiceLevel ?? ''}
        onChange={(event) =>
          onChange({
            spiceLevel: event.target.value
              ? (event.target.value as SpiceLevel)
              : null,
          })
        }
      >
        <option value="">All spice</option>
        {SPICE_LEVEL_LIST.map((level) => (
          <option key={level} value={level}>
            {SPICE_LEVEL[level]}
          </option>
        ))}
      </select>

      <label className="sr-only" htmlFor="menu-filter-sort">
        Sort
      </label>
      <select
        id="menu-filter-sort"
        className={cn(selectClass, 'w-[7.5rem]')}
        value={filters.sortBy}
        onChange={(event) =>
          onChange({ sortBy: event.target.value as SortFilter })
        }
      >
        {sortOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {hasActiveFilters ? (
        <button
          type="button"
          onClick={onClear}
          className="h-9 shrink-0 px-2 text-xs font-medium text-primary hover:underline"
        >
          Clear
        </button>
      ) : null}
    </section>
  )
}
