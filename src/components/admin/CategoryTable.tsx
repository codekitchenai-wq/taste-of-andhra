import { Pencil, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import type { Category } from '@/types/Category'
import { LazyImage } from '@/components/ui/LazyImage'

interface CategoryTableProps {
  categories: Category[]
  onEdit: (category: Category) => void
  onDelete: (category: Category) => void
}

export function CategoryTable({
  categories,
  onEdit,
  onDelete,
}: CategoryTableProps) {
  return (
    <div className="overflow-x-auto rounded-[var(--radius-card)] bg-surface shadow-md">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-black/5 bg-background/60">
          <tr>
            <th className="px-4 py-3 font-semibold text-text-primary">Name</th>
            <th className="px-4 py-3 font-semibold text-text-primary">Slug</th>
            <th className="px-4 py-3 font-semibold text-text-primary">Order</th>
            <th className="px-4 py-3 font-semibold text-text-primary">Status</th>
            <th className="px-4 py-3 font-semibold text-text-primary">Actions</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((category) => (
            <tr
              key={category.id}
              className="border-b border-black/5 last:border-b-0"
            >
              <td className="px-4 py-4">
                <div className="flex items-center gap-3">
                  {category.image_url ? (
                    <LazyImage
                      src={category.image_url}
                      alt={category.name}
                      className="h-10 w-10 rounded-[var(--radius-input)] object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-input)] bg-primary/10 text-sm font-semibold text-primary">
                      {category.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-text-primary">
                      {category.name}
                    </p>
                    {category.description && (
                      <p className="mt-0.5 line-clamp-1 text-xs text-text-secondary">
                        {category.description}
                      </p>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-4 py-4 text-text-secondary">{category.slug}</td>
              <td className="px-4 py-4 text-text-secondary">
                {category.display_order}
              </td>
              <td className="px-4 py-4">
                <Badge variant={category.is_active ? 'veg' : 'unavailable'}>
                  {category.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </td>
              <td className="px-4 py-4">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onEdit(category)}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-primary/10 hover:text-primary"
                    aria-label={`Edit ${category.name}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(category)}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-error/10 hover:text-error"
                    aria-label={`Delete ${category.name}`}
                    disabled={!category.is_active}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
