import { useMemo, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { CategoryFormModal } from '@/components/admin/CategoryFormModal'
import { CategoryTable } from '@/components/admin/CategoryTable'
import { DeleteCategoryModal } from '@/components/admin/DeleteCategoryModal'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Input } from '@/components/ui/Input'
import { LoadingState } from '@/components/ui/LoadingState'
import { useCategories } from '@/hooks/useCategories'
import type { Category } from '@/types/Category'

export default function AdminCategoriesPage() {
  const { categories, isLoading, error, refetch } = useCategories()
  const [search, setSearch] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(
    null,
  )

  const filteredCategories = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) return categories

    return categories.filter(
      (category) =>
        category.name.toLowerCase().includes(query) ||
        category.slug.toLowerCase().includes(query) ||
        category.description?.toLowerCase().includes(query),
    )
  }, [categories, search])

  const openCreateModal = () => {
    setEditingCategory(null)
    setIsFormOpen(true)
  }

  const openEditModal = (category: Category) => {
    setEditingCategory(category)
    setIsFormOpen(true)
  }

  const closeFormModal = () => {
    setIsFormOpen(false)
    setEditingCategory(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Categories</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Manage menu categories — add, edit, and organize dishes.
          </p>
        </div>
        <Button onClick={openCreateModal} className="shrink-0">
          <Plus className="h-4 w-4" />
          Add Category
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary"
          aria-hidden="true"
        />
        <Input
          placeholder="Search categories..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="pl-10"
          aria-label="Search categories"
        />
      </div>

      {isLoading && <LoadingState variant="inline" />}

      {!isLoading && error && (
        <ErrorState message={error} onRetry={() => void refetch()} />
      )}

      {!isLoading && !error && filteredCategories.length === 0 && (
        <EmptyState
          title={search ? 'No categories found' : 'No categories yet'}
          description={
            search
              ? 'Try a different search term.'
              : 'Create your first category to organize the menu.'
          }
          actionLabel={search ? undefined : 'Add Category'}
          onAction={search ? undefined : openCreateModal}
        />
      )}

      {!isLoading && !error && filteredCategories.length > 0 && (
        <CategoryTable
          categories={filteredCategories}
          onEdit={openEditModal}
          onDelete={setDeletingCategory}
        />
      )}

      <CategoryFormModal
        isOpen={isFormOpen}
        category={editingCategory}
        onClose={closeFormModal}
        onSuccess={() => void refetch()}
      />

      <DeleteCategoryModal
        category={deletingCategory}
        onClose={() => setDeletingCategory(null)}
        onSuccess={() => void refetch()}
      />
    </div>
  )
}
