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
import { WEBSITE_STARTER_MAX_MENU_ITEMS } from '@/constants/ONBOARDING'
import { useCategories } from '@/hooks/useCategories'
import { useDishes } from '@/hooks/useDishes'
import { useOrganization } from '@/contexts/OrganizationContext'
import type { DishWithCategory } from '@/utils/mapDish'
import {
  isWebsiteStarterTrack,
  MAX_MENU_ITEMS_SETTING_KEY,
} from '@/utils/websiteStarter'
import { toast } from 'react-hot-toast'

export default function AdminDishesPage() {
  const org = useOrganization()
  const { dishes, isLoading, error, refetch } = useDishes()
  const { categories } = useCategories()
  const [search, setSearch] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingDish, setEditingDish] = useState<DishWithCategory | null>(null)
  const [deletingDish, setDeletingDish] = useState<DishWithCategory | null>(
    null,
  )

  const maxMenuItems = isWebsiteStarterTrack(org.settings)
    ? Number(org.settings[MAX_MENU_ITEMS_SETTING_KEY]) ||
      WEBSITE_STARTER_MAX_MENU_ITEMS
    : null

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
    if (maxMenuItems != null && dishes.length >= maxMenuItems) {
      toast.error(
        `Website Starter allows up to ${maxMenuItems} menu items. Remove one or upgrade.`,
      )
      return
    }
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
      <div className="flex items-center justify-between gap-3">
        {maxMenuItems != null && (
          <p className="text-sm text-text-secondary">
            Website Starter: {dishes.length}/{maxMenuItems} items
          </p>
        )}
        <Button onClick={openCreateModal} className="ml-auto shrink-0">
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
