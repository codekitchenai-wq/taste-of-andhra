import { Pencil, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import type { DishWithCategory } from '@/utils/mapDish'
import { LazyImage } from '@/components/ui/LazyImage'
import { formatPrice } from '@/utils/format'

interface DishTableProps {
  dishes: DishWithCategory[]
  onEdit: (dish: DishWithCategory) => void
  onDelete: (dish: DishWithCategory) => void
}

export function DishTable({ dishes, onEdit, onDelete }: DishTableProps) {
  return (
    <div className="overflow-x-auto rounded-[var(--radius-card)] bg-surface shadow-md">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="border-b border-black/5 bg-background/60">
          <tr>
            <th className="px-4 py-3 font-semibold text-text-primary">Dish</th>
            <th className="px-4 py-3 font-semibold text-text-primary">
              Category
            </th>
            <th className="px-4 py-3 font-semibold text-text-primary">Price</th>
            <th className="px-4 py-3 font-semibold text-text-primary">Type</th>
            <th className="px-4 py-3 font-semibold text-text-primary">
              Featured
            </th>
            <th className="px-4 py-3 font-semibold text-text-primary">
              Available
            </th>
            <th className="px-4 py-3 font-semibold text-text-primary">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {dishes.map((dish) => (
            <tr
              key={dish.id}
              className="border-b border-black/5 last:border-b-0"
            >
              <td className="px-4 py-4">
                <div className="flex items-center gap-3">
                  {dish.image_url ? (
                    <LazyImage
                      src={dish.image_url}
                      alt={dish.name}
                      className="h-10 w-10 rounded-[var(--radius-input)] object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-input)] bg-primary/10 text-sm font-semibold text-primary">
                      {dish.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-text-primary">{dish.name}</p>
                    {dish.description && (
                      <p className="mt-0.5 line-clamp-1 text-xs text-text-secondary">
                        {dish.description}
                      </p>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-4 py-4 text-text-secondary">
                {dish.category_name}
              </td>
              <td className="px-4 py-4 font-medium text-text-primary">
                {formatPrice(dish.price)}
              </td>
              <td className="px-4 py-4">
                <Badge variant={dish.is_veg ? 'veg' : 'nonVeg'}>
                  {dish.is_veg ? 'Veg' : 'Non-Veg'}
                </Badge>
              </td>
              <td className="px-4 py-4">
                <Badge variant={dish.is_featured ? 'featured' : 'default'}>
                  {dish.is_featured ? 'Yes' : 'No'}
                </Badge>
              </td>
              <td className="px-4 py-4">
                <Badge variant={dish.is_available ? 'veg' : 'unavailable'}>
                  {dish.is_available ? 'Yes' : 'No'}
                </Badge>
              </td>
              <td className="px-4 py-4">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onEdit(dish)}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-primary/10 hover:text-primary"
                    aria-label={`Edit ${dish.name}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(dish)}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-error/10 hover:text-error"
                    aria-label={`Delete ${dish.name}`}
                    disabled={!dish.is_available}
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
