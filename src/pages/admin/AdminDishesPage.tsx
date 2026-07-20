import { useMemo, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { DeleteDishModal } from '@/components/admin/DeleteDishModal'
import { DishFormModal } from '@/components/admin/DishFormModal'
import { DishTable } from '@/components/admin/DishTable'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Input } from '@/components/ui/Input'
import { LoadingState } from '@/components/ui/LoadingState'
import { useCategories } from '@/hooks/useCategories'
import { useDishes } from '@/hooks/useDishes'
import type { DishWithCategory } from '@/utils/mapDish'

export default function AdminDishesPage() {
  const { dishes, isLoading, error, refetch } = useDishes()
  const { categories } = useCategories()
  const [search, setSearch] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingDish, setEditingDish] = useState<DishWithCategory | null>(null)
  const [deletingDish, setDeletingDish] = useState<DishWithCategory | null>(
    null,
  )

  const filteredDishes = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) return dishes

    return dishes.filter(
      (dish) =>
        dish.name.toLowerCase().includes(query) ||
        dish.slug.toLowerCase().includes(query) ||
        dish.category_name.toLowerCase().includes(query) ||
        dish.description?.toLowerCase().includes(query),
    )
  }, [dishes, search])

  const openCreateModal = () => {
    setEditingDish(null)
    setIsFormOpen(true)
  }

  const openEditModal = (dish: DishWithCategory) => {
    setEditingDish(dish)
    setIsFormOpen(true)
  }

  const closeFormModal = () => {
    setIsFormOpen(false)
    setEditingDish(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Dishes</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Manage menu items — pricing, availability, and images.
          </p>
        </div>
        <Button onClick={openCreateModal} className="shrink-0">
          <Plus className="h-4 w-4" />
          Add Dish
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary"
          aria-hidden="true"
        />
        <Input
          placeholder="Search dishes..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="pl-10"
          aria-label="Search dishes"
        />
      </div>

      {isLoading && <LoadingState variant="inline" />}

      {!isLoading && error && (
        <ErrorState message={error} onRetry={() => void refetch()} />
      )}

      {!isLoading && !error && filteredDishes.length === 0 && (
        <EmptyState
          title={search ? 'No dishes found' : 'No dishes yet'}
          description={
            search
              ? 'Try a different search term.'
              : 'Create your first dish to populate the menu.'
          }
          actionLabel={search ? undefined : 'Add Dish'}
          onAction={search ? undefined : openCreateModal}
        />
      )}

      {!isLoading && !error && filteredDishes.length > 0 && (
        <DishTable
          dishes={filteredDishes}
          onEdit={openEditModal}
          onDelete={setDeletingDish}
        />
      )}

      <DishFormModal
        isOpen={isFormOpen}
        dish={editingDish}
        categories={categories}
        onClose={closeFormModal}
        onSuccess={() => void refetch()}
      />

      <DeleteDishModal
        dish={deletingDish}
        onClose={() => setDeletingDish(null)}
        onSuccess={() => void refetch()}
      />
    </div>
  )
}
